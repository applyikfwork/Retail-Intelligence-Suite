import { Router } from "express";
import { db } from "@workspace/db";
import { salesTable, customersTable } from "@workspace/db";
import { CreateSaleBody } from "@workspace/api-zod";
import { eq, desc, sql } from "drizzle-orm";
import { fromError } from "zod-validation-error";

const router = Router();

router.get("/sales", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;

    const sales = await db
      .select({
        id: salesTable.id,
        customerId: salesTable.customerId,
        customerName: customersTable.name,
        service: salesTable.service,
        amount: salesTable.amount,
        paymentMethod: salesTable.paymentMethod,
        createdAt: salesTable.createdAt,
      })
      .from(salesTable)
      .leftJoin(customersTable, eq(salesTable.customerId, customersTable.id))
      .orderBy(desc(salesTable.createdAt))
      .limit(limit);

    res.json(
      sales.map((s) => ({
        ...s,
        amount: Number(s.amount),
        createdAt: s.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Error listing sales");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/sales", async (req, res) => {
  try {
    const parsed = CreateSaleBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: fromError(parsed.error).message });
    }

    const [sale] = await db
      .insert(salesTable)
      .values({
        customerId: parsed.data.customerId || null,
        service: parsed.data.service,
        amount: String(parsed.data.amount),
        paymentMethod: parsed.data.paymentMethod,
      })
      .returning();

    if (parsed.data.customerId) {
      await db
        .update(customersTable)
        .set({
          totalSpend: sql`total_spend + ${parsed.data.amount}`,
          visitCount: sql`visit_count + 1`,
          lastVisit: new Date(),
          tier: sql`CASE WHEN (total_spend::numeric + ${parsed.data.amount}) >= 10000 THEN 'vip'::customer_tier WHEN (total_spend::numeric + ${parsed.data.amount}) >= 2000 THEN 'regular'::customer_tier ELSE tier END`,
        })
        .where(eq(customersTable.id, parsed.data.customerId));
    }

    let customerName = null;
    if (parsed.data.customerId) {
      const [customer] = await db
        .select({ name: customersTable.name })
        .from(customersTable)
        .where(eq(customersTable.id, parsed.data.customerId));
      customerName = customer?.name || null;
    }

    res.status(201).json({
      ...sale,
      customerName,
      amount: Number(sale.amount),
      createdAt: sale.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Error creating sale");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
