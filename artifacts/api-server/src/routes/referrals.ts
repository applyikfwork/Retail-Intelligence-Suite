import { Router } from "express";
import { db } from "@workspace/db";
import { referralsTable, customersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { fromError } from "zod-validation-error";
import { z } from "zod";
import { randomUUID } from "crypto";

const router = Router();

const CreateReferralBody = z.object({
  referrerId: z.number().int(),
  referredName: z.string().min(1),
  referredPhone: z.string().min(1),
});

router.get("/referrals", async (req, res) => {
  try {
    const rows = await db
      .select({
        id: referralsTable.id,
        referrerId: referralsTable.referrerId,
        referrerName: customersTable.name,
        referredName: referralsTable.referredName,
        referredPhone: referralsTable.referredPhone,
        referralCode: referralsTable.referralCode,
        isConverted: referralsTable.isConverted,
        rewardGiven: referralsTable.rewardGiven,
        convertedAt: referralsTable.convertedAt,
        createdAt: referralsTable.createdAt,
      })
      .from(referralsTable)
      .leftJoin(customersTable, eq(referralsTable.referrerId, customersTable.id))
      .orderBy(desc(referralsTable.createdAt));

    res.json(
      rows.map((r) => ({
        ...r,
        referrerName: r.referrerName || "Unknown",
        convertedAt: r.convertedAt?.toISOString() || null,
        createdAt: r.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Error listing referrals");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/referrals", async (req, res) => {
  try {
    const parsed = CreateReferralBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: fromError(parsed.error).message });

    const code = `REF-${parsed.data.referrerId}-${randomUUID().slice(0, 6).toUpperCase()}`;

    const [referral] = await db
      .insert(referralsTable)
      .values({
        referrerId: parsed.data.referrerId,
        referredName: parsed.data.referredName,
        referredPhone: parsed.data.referredPhone,
        referralCode: code,
        isConverted: false,
        rewardGiven: false,
      })
      .returning();

    const [referrer] = await db
      .select({ name: customersTable.name })
      .from(customersTable)
      .where(eq(customersTable.id, parsed.data.referrerId));

    res.status(201).json({
      ...referral,
      referrerName: referrer?.name || "Unknown",
      convertedAt: null,
      createdAt: referral.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Error creating referral");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/referrals/:code/convert", async (req, res) => {
  try {
    const { code } = req.params;
    const [referral] = await db
      .select()
      .from(referralsTable)
      .where(eq(referralsTable.referralCode, code));

    if (!referral) return res.status(404).json({ error: "Referral code not found" });
    if (referral.isConverted) return res.status(400).json({ error: "Already converted" });

    const [updated] = await db
      .update(referralsTable)
      .set({ isConverted: true, rewardGiven: true, convertedAt: new Date() })
      .where(eq(referralsTable.referralCode, code))
      .returning();

    const [referrer] = await db
      .select({ name: customersTable.name })
      .from(customersTable)
      .where(eq(customersTable.id, updated.referrerId));

    res.json({
      ...updated,
      referrerName: referrer?.name || "Unknown",
      convertedAt: updated.convertedAt?.toISOString() || null,
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Error converting referral");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
