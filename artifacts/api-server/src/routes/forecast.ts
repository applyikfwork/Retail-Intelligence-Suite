import { Router } from "express";
import { db } from "@workspace/db";
import { salesTable } from "@workspace/db";
import { sql, gte } from "drizzle-orm";

const router = Router();

router.get("/forecast/revenue", async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get daily totals for the last 30 days
    const dailyData = await db
      .select({
        day: sql<string>`date_trunc('day', created_at)::text`,
        dow: sql<number>`extract(dow from created_at)::int`,
        total: sql<number>`sum(amount::numeric)`,
      })
      .from(salesTable)
      .where(gte(salesTable.createdAt, thirtyDaysAgo))
      .groupBy(sql`date_trunc('day', created_at), extract(dow from created_at)`);

    // Compute per-DOW averages
    const dowMap = new Map<number, number[]>();
    for (const d of dailyData) {
      const arr = dowMap.get(d.dow) ?? [];
      arr.push(Number(d.total));
      dowMap.set(d.dow, arr);
    }
    const dowAvg = new Map<number, number>();
    for (const [dow, totals] of dowMap.entries()) {
      dowAvg.set(dow, totals.reduce((s, v) => s + v, 0) / totals.length);
    }

    const allTotals = dailyData.map((d) => Number(d.total));
    const globalAvg = allTotals.length > 0
      ? allTotals.reduce((s, v) => s + v, 0) / allTotals.length
      : 2000;

    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const deadZoneDows = new Set([2]); // Tuesday

    const days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() + i + 1);
      const dow = date.getDay();
      const base = dowAvg.get(dow) ?? globalAvg;
      const variance = base * 0.15;
      const predicted = Math.max(500, Math.round(base + (Math.random() - 0.5) * variance * 2));
      const isDeadZoneRisk = deadZoneDows.has(dow);

      return {
        date: date.toISOString().split("T")[0],
        dayName: dayNames[dow],
        predictedRevenue: predicted,
        lowerBound: Math.round(predicted * 0.8),
        upperBound: Math.round(predicted * 1.2),
        isDeadZoneRisk,
        suggestedAction: isDeadZoneRisk
          ? "Launch Happy Hour campaign — 35% off to VIP customers"
          : null,
      };
    });

    const weekTotal = days.reduce((s, d) => s + d.predictedRevenue, 0);
    const avgDay = weekTotal / 7;
    const trend = avgDay > globalAvg * 1.05 ? "up" : avgDay < globalAvg * 0.95 ? "down" : "stable";

    res.json({
      days,
      weekTotal,
      confidenceLevel: dailyData.length >= 10 ? "High" : dailyData.length >= 5 ? "Medium" : "Low",
      trend,
      insight:
        trend === "up"
          ? "Revenue is trending upward — great time to stock up on supplies and prepare for higher footfall!"
          : trend === "down"
          ? "A slow week ahead — consider running promotions on Thursday and Friday to drive bookings."
          : "Stable week ahead — maintain current service quality and upsell premium services.",
    });
  } catch (err) {
    req.log.error({ err }, "Error generating forecast");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
