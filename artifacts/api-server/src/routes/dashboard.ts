import { Router } from "express";
import { db } from "@workspace/db";
import { customersTable, salesTable, campaignsTable, loyaltyCardsTable } from "@workspace/db";
import { sql, gte, and } from "drizzle-orm";

const router = Router();

router.get("/dashboard/summary", async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalCustomers] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(customersTable);

    const [todaySalesResult] = await db
      .select({
        revenue: sql<number>`coalesce(sum(amount::numeric), 0)`,
        customers: sql<number>`count(distinct customer_id)::int`,
      })
      .from(salesTable)
      .where(gte(salesTable.createdAt, today));

    const [activeCampaigns] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(campaignsTable)
      .where(sql`status in ('sent', 'scheduled')`);

    const [todayScans] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(loyaltyCardsTable)
      .where(gte(loyaltyCardsTable.lastScan as any, today));

    const [yesterdaySales] = await db
      .select({ revenue: sql<number>`coalesce(sum(amount::numeric), 0)` })
      .from(salesTable)
      .where(
        and(
          gte(salesTable.createdAt, new Date(today.getTime() - 86400000)),
          sql`created_at < ${today}`
        )
      );

    const todayRevenue = Number(todaySalesResult.revenue) || 0;
    const yesterdayRevenue = Number(yesterdaySales.revenue) || 1;
    const growthPercent = ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100;

    const topServiceResult = await db
      .select({
        service: salesTable.service,
        count: sql<number>`count(*)::int`,
      })
      .from(salesTable)
      .where(gte(salesTable.createdAt, today))
      .groupBy(salesTable.service)
      .orderBy(sql`count(*) desc`)
      .limit(1);

    res.json({
      todayRevenue,
      todayCustomers: todaySalesResult.customers || 0,
      totalCustomers: totalCustomers.count,
      activeCampaigns: activeCampaigns.count,
      loyaltyScansToday: todayScans.count,
      revenueGrowthPercent: Math.round(growthPercent * 10) / 10,
      topServiceToday: topServiceResult[0]?.service || "Hair Spa",
      deadZoneAlert:
        new Date().getHours() >= 14 && new Date().getHours() <= 16
          ? "Dead zone detected: 2 PM - 4 PM. Launch a Happy Hour campaign!"
          : null,
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching dashboard summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/sales-by-hour", async (req, res) => {
  try {
    const results = await db
      .select({
        hour: sql<number>`extract(hour from created_at)::int`,
        revenue: sql<number>`coalesce(sum(amount::numeric), 0)`,
        customers: sql<number>`count(*)::int`,
      })
      .from(salesTable)
      .groupBy(sql`extract(hour from created_at)`)
      .orderBy(sql`extract(hour from created_at)`);

    const hourMap = new Map(results.map((r) => [r.hour, r]));
    const deadZoneHours = new Set([14, 15]);

    const all = Array.from({ length: 15 }, (_, i) => {
      const hour = i + 8;
      const data = hourMap.get(hour);
      const ampm = hour < 12 ? "AM" : "PM";
      const displayHour = hour <= 12 ? hour : hour - 12;
      return {
        hour,
        label: `${displayHour} ${ampm}`,
        revenue: Number(data?.revenue || 0),
        customers: data?.customers || 0,
        isDeadZone: deadZoneHours.has(hour),
      };
    });

    res.json(all);
  } catch (err) {
    req.log.error({ err }, "Error fetching sales by hour");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/sales-by-day", async (req, res) => {
  try {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    const results = await db
      .select({
        dow: sql<number>`extract(dow from created_at)::int`,
        revenue: sql<number>`coalesce(sum(amount::numeric), 0)`,
        customers: sql<number>`count(*)::int`,
      })
      .from(salesTable)
      .groupBy(sql`extract(dow from created_at)`)
      .orderBy(sql`extract(dow from created_at)`);

    const dowMap = new Map(results.map((r) => [r.dow, r]));

    const all = days.map((day, i) => {
      const data = dowMap.get(i);
      return {
        day,
        revenue: Number(data?.revenue || 0),
        customers: data?.customers || 0,
      };
    });

    res.json(all);
  } catch (err) {
    req.log.error({ err }, "Error fetching sales by day");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/recent-activity", async (req, res) => {
  try {
    const recentSales = await db
      .select({
        id: salesTable.id,
        service: salesTable.service,
        amount: salesTable.amount,
        createdAt: salesTable.createdAt,
        customerId: salesTable.customerId,
      })
      .from(salesTable)
      .orderBy(sql`created_at desc`)
      .limit(5);

    const recentCampaigns = await db
      .select({ id: campaignsTable.id, title: campaignsTable.title, createdAt: campaignsTable.createdAt })
      .from(campaignsTable)
      .orderBy(sql`created_at desc`)
      .limit(3);

    const activities = [
      ...recentSales.map((s) => ({
        id: s.id,
        type: "sale" as const,
        description: `Sale: ${s.service}`,
        customerName: null,
        amount: Number(s.amount),
        createdAt: s.createdAt.toISOString(),
      })),
      ...recentCampaigns.map((c) => ({
        id: c.id + 1000,
        type: "campaign" as const,
        description: `Campaign sent: ${c.title}`,
        customerName: null,
        amount: null,
        createdAt: c.createdAt.toISOString(),
      })),
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8);

    res.json(activities);
  } catch (err) {
    req.log.error({ err }, "Error fetching recent activity");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
