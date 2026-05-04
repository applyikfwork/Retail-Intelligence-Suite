import { Router } from "express";
import { db } from "@workspace/db";
import { staffTable, salesTable, appointmentsTable } from "@workspace/db";
import { eq, sql, desc } from "drizzle-orm";
import { fromError } from "zod-validation-error";
import { z } from "zod";

const router = Router();

const CreateStaffBody = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  role: z.string().default("Stylist"),
  salary: z.number().default(0),
  commissionPercent: z.number().default(10),
});

router.get("/staff", async (req, res) => {
  try {
    const staff = await db.select().from(staffTable).orderBy(desc(staffTable.createdAt));
    res.json(
      staff.map((s) => ({
        ...s,
        salary: Number(s.salary),
        commissionPercent: Number(s.commissionPercent),
        joinedAt: s.joinedAt.toISOString(),
        createdAt: s.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Error listing staff");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/staff", async (req, res) => {
  try {
    const parsed = CreateStaffBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: fromError(parsed.error).message });

    const [member] = await db
      .insert(staffTable)
      .values({
        name: parsed.data.name,
        phone: parsed.data.phone,
        role: parsed.data.role,
        salary: String(parsed.data.salary),
        commissionPercent: String(parsed.data.commissionPercent),
      })
      .returning();

    res.status(201).json({
      ...member,
      salary: Number(member.salary),
      commissionPercent: Number(member.commissionPercent),
      joinedAt: member.joinedAt.toISOString(),
      createdAt: member.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Error creating staff");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/staff/:id/performance", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const [member] = await db.select().from(staffTable).where(eq(staffTable.id, id));
    if (!member) return res.status(404).json({ error: "Staff not found" });

    const [salesResult] = await db
      .select({
        count: sql<number>`count(*)::int`,
        total: sql<number>`coalesce(sum(amount::numeric), 0)`,
      })
      .from(salesTable);

    const [apptResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(appointmentsTable)
      .where(eq(appointmentsTable.staffId, id));

    const topServiceResult = await db
      .select({
        service: salesTable.service,
        count: sql<number>`count(*)::int`,
      })
      .from(salesTable)
      .groupBy(salesTable.service)
      .orderBy(sql`count(*) desc`)
      .limit(1);

    const totalRevenue = Number(salesResult.total);
    const commissionPercent = Number(member.commissionPercent);
    const commissionEarned = (totalRevenue * commissionPercent) / 100;
    const totalSales = salesResult.count;
    const avgSaleValue = totalSales > 0 ? totalRevenue / totalSales : 0;

    res.json({
      staffId: id,
      staffName: member.name,
      totalSales,
      totalRevenue,
      commissionEarned: Math.round(commissionEarned),
      avgSaleValue: Math.round(avgSaleValue),
      topService: topServiceResult[0]?.service || "N/A",
      appointmentsCompleted: apptResult.count,
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching staff performance");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
