import { Router } from "express";
import { db } from "@workspace/db";
import { customersTable } from "@workspace/db";
import { sql, lt, isNotNull } from "drizzle-orm";

const router = Router();

router.get("/customers/win-back", async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const atRisk = await db
      .select()
      .from(customersTable)
      .where(
        sql`(last_visit IS NOT NULL AND last_visit < ${thirtyDaysAgo}) OR (last_visit IS NULL AND created_at < ${thirtyDaysAgo})`
      )
      .orderBy(sql`total_spend::numeric desc`)
      .limit(20);

    const result = atRisk.map((c) => {
      const lastVisitDate = c.lastVisit || c.createdAt;
      const daysSince = Math.floor(
        (Date.now() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      const totalSpend = Number(c.totalSpend);

      let suggestedOffer = "";
      if (c.tier === "vip") {
        suggestedOffer = `VIP exclusive: 30% off any service — we miss you, ${c.name.split(" ")[0]}!`;
      } else if (c.tier === "regular") {
        suggestedOffer = `Special comeback offer: 20% off + free tea on your next visit`;
      } else {
        suggestedOffer = `Welcome back offer: Free head massage with any service booking`;
      }

      // Simple LTV projection: avg monthly spend × 12
      const avgMonthlySpend = totalSpend / Math.max(c.visitCount, 1);
      const ltv = avgMonthlySpend * 12;

      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        tier: c.tier,
        totalSpend,
        daysSinceVisit: daysSince,
        suggestedOffer,
        ltv: Math.round(ltv),
      };
    });

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Error fetching win-back customers");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
