import { Router } from "express";
import { db } from "@workspace/db";
import { campaignsTable, customersTable } from "@workspace/db";
import { CreateCampaignBody } from "@workspace/api-zod";
import { eq, desc, sql } from "drizzle-orm";
import { fromError } from "zod-validation-error";

const router = Router();

router.get("/campaigns", async (req, res) => {
  try {
    const campaigns = await db
      .select()
      .from(campaignsTable)
      .orderBy(desc(campaignsTable.createdAt));

    res.json(
      campaigns.map((c) => ({
        ...c,
        scheduledFor: c.scheduledFor?.toISOString() || null,
        createdAt: c.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Error listing campaigns");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/campaigns", async (req, res) => {
  try {
    const parsed = CreateCampaignBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: fromError(parsed.error).message });
    }

    let sentCount = 0;
    if (!parsed.data.scheduledFor) {
      const tier = parsed.data.targetTier;
      const [result] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(customersTable)
        .where(tier === "all" ? sql`1=1` : eq(customersTable.tier, tier as any));
      sentCount = result.count;
    }

    const [campaign] = await db
      .insert(campaignsTable)
      .values({
        title: parsed.data.title,
        message: parsed.data.message,
        discountPercent: parsed.data.discountPercent || null,
        targetTier: parsed.data.targetTier,
        sentCount,
        responseCount: 0,
        status: parsed.data.scheduledFor ? "scheduled" : "sent",
        scheduledFor: parsed.data.scheduledFor ? new Date(parsed.data.scheduledFor) : null,
      })
      .returning();

    res.status(201).json({
      ...campaign,
      scheduledFor: campaign.scheduledFor?.toISOString() || null,
      createdAt: campaign.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Error creating campaign");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/campaigns/dead-zones", async (req, res) => {
  try {
    const deadZones = [
      {
        dayOfWeek: "Tuesday",
        startHour: 14,
        endHour: 16,
        avgRevenue: 320,
        label: "Tue 2–4 PM",
        suggestedDiscount: 40,
      },
      {
        dayOfWeek: "Wednesday",
        startHour: 13,
        endHour: 15,
        avgRevenue: 280,
        label: "Wed 1–3 PM",
        suggestedDiscount: 35,
      },
      {
        dayOfWeek: "Monday",
        startHour: 10,
        endHour: 12,
        avgRevenue: 410,
        label: "Mon 10 AM–12 PM",
        suggestedDiscount: 25,
      },
    ];

    res.json(deadZones);
  } catch (err) {
    req.log.error({ err }, "Error fetching dead zones");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
