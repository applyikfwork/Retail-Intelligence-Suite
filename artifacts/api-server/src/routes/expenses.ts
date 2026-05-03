import { Router } from "express";
import { db } from "@workspace/db";
import { expensesTable, salesTable } from "@workspace/db";
import { sql, desc } from "drizzle-orm";
import { fromError } from "zod-validation-error";
import { z } from "zod";

const router = Router();

const CreateExpenseBody = z.object({
  title: z.string().min(1),
  amount: z.number().positive(),
  category: z.enum(["rent", "salaries", "supplies", "utilities", "marketing", "equipment", "other"]),
  notes: z.string().optional().nullable(),
  date: z.string().optional().nullable(),
});

router.get("/expenses", async (req, res) => {
  try {
    const expenses = await db.select().from(expensesTable).orderBy(desc(expensesTable.date));
    res.json(
      expenses.map((e) => ({
        ...e,
        amount: Number(e.amount),
        date: e.date.toISOString(),
        createdAt: e.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Error listing expenses");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/expenses", async (req, res) => {
  try {
    const parsed = CreateExpenseBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: fromError(parsed.error).message });

    const [expense] = await db
      .insert(expensesTable)
      .values({
        title: parsed.data.title,
        amount: String(parsed.data.amount),
        category: parsed.data.category,
        notes: parsed.data.notes || null,
        date: parsed.data.date ? new Date(parsed.data.date) : new Date(),
      })
      .returning();

    res.status(201).json({
      ...expense,
      amount: Number(expense.amount),
      date: expense.date.toISOString(),
      createdAt: expense.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Error creating expense");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/expenses/profit-summary", async (req, res) => {
  try {
    const [revenueResult] = await db
      .select({ total: sql<number>`coalesce(sum(amount::numeric), 0)` })
      .from(salesTable);

    const [expenseResult] = await db
      .select({ total: sql<number>`coalesce(sum(amount::numeric), 0)` })
      .from(expensesTable);

    const expenseByCategory = await db
      .select({
        category: expensesTable.category,
        amount: sql<number>`coalesce(sum(amount::numeric), 0)`,
      })
      .from(expensesTable)
      .groupBy(expensesTable.category);

    const totalRevenue = Number(revenueResult.total);
    const totalExpenses = Number(expenseResult.total);
    const grossProfit = totalRevenue - totalExpenses;
    const netProfitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    const expenseBreakdown = expenseByCategory.map((e) => ({
      category: e.category,
      amount: Number(e.amount),
      percentage: totalExpenses > 0 ? Math.round((Number(e.amount) / totalExpenses) * 100) : 0,
    }));

    // Monthly trend (last 6 months)
    const monthlyRevenue = await db
      .select({
        month: sql<string>`to_char(date_trunc('month', created_at), 'Mon YYYY')`,
        revenue: sql<number>`coalesce(sum(amount::numeric), 0)`,
      })
      .from(salesTable)
      .groupBy(sql`date_trunc('month', created_at)`)
      .orderBy(sql`date_trunc('month', created_at)`)
      .limit(6);

    const monthlyExpenses = await db
      .select({
        month: sql<string>`to_char(date_trunc('month', date), 'Mon YYYY')`,
        expenses: sql<number>`coalesce(sum(amount::numeric), 0)`,
      })
      .from(expensesTable)
      .groupBy(sql`date_trunc('month', date)`)
      .orderBy(sql`date_trunc('month', date)`)
      .limit(6);

    const expMap = new Map(monthlyExpenses.map((e) => [e.month, Number(e.expenses)]));
    const monthlyTrend = monthlyRevenue.map((r) => ({
      month: r.month,
      revenue: Number(r.revenue),
      expenses: expMap.get(r.month) || 0,
      profit: Number(r.revenue) - (expMap.get(r.month) || 0),
    }));

    res.json({
      totalRevenue,
      totalExpenses,
      grossProfit,
      netProfitMargin: Math.round(netProfitMargin * 10) / 10,
      expenseBreakdown,
      monthlyTrend,
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching profit summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
