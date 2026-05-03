import { Router } from "express";
import { db } from "@workspace/db";
import { loyaltyCardsTable, customersTable } from "@workspace/db";
import { RecordLoyaltyScanBody } from "@workspace/api-zod";
import { eq, desc, sql } from "drizzle-orm";
import { fromError } from "zod-validation-error";

const router = Router();

router.get("/loyalty/cards", async (req, res) => {
  try {
    const cards = await db
      .select({
        id: loyaltyCardsTable.id,
        customerId: loyaltyCardsTable.customerId,
        customerName: customersTable.name,
        phone: customersTable.phone,
        scanCount: loyaltyCardsTable.scanCount,
        freeSessionEarned: loyaltyCardsTable.freeSessionEarned,
        freeSessionRedeemed: loyaltyCardsTable.freeSessionRedeemed,
        qrCode: loyaltyCardsTable.qrCode,
        lastScan: loyaltyCardsTable.lastScan,
      })
      .from(loyaltyCardsTable)
      .leftJoin(customersTable, eq(loyaltyCardsTable.customerId, customersTable.id))
      .orderBy(desc(loyaltyCardsTable.scanCount));

    res.json(
      cards.map((c) => ({
        ...c,
        lastScan: c.lastScan?.toISOString() || null,
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Error listing loyalty cards");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/loyalty/scan", async (req, res) => {
  try {
    const parsed = RecordLoyaltyScanBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: fromError(parsed.error).message });
    }

    const [card] = await db
      .select()
      .from(loyaltyCardsTable)
      .where(eq(loyaltyCardsTable.qrCode, parsed.data.qrCode));

    if (!card) {
      return res.status(404).json({ error: "QR code not found" });
    }

    const newScanCount = card.scanCount + 1;
    const freeSessionEarned = newScanCount >= 6;

    await db
      .update(loyaltyCardsTable)
      .set({
        scanCount: newScanCount,
        freeSessionEarned,
        lastScan: new Date(),
      })
      .where(eq(loyaltyCardsTable.id, card.id));

    await db
      .update(customersTable)
      .set({ loyaltyScanCount: sql`loyalty_scan_count + 1` })
      .where(eq(customersTable.id, card.customerId));

    const nextFreeAt = freeSessionEarned ? 0 : 6 - newScanCount;

    res.json({
      success: true,
      scanCount: newScanCount,
      freeSessionEarned,
      nextFreeAt,
      message: freeSessionEarned
        ? "Congratulations! FREE session earned! Present to cashier."
        : `Scan recorded! ${nextFreeAt} more visit${nextFreeAt === 1 ? "" : "s"} for a free session.`,
    });
  } catch (err) {
    req.log.error({ err }, "Error recording loyalty scan");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
