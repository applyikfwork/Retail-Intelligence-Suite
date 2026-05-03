import { Router } from "express";
import { db } from "@workspace/db";
import { reviewsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { fromError } from "zod-validation-error";
import { z } from "zod";

const router = Router();

const ReviewReplyBody = z.object({ reply: z.string().min(1) });

router.get("/reviews", async (req, res) => {
  try {
    const reviews = await db.select().from(reviewsTable).orderBy(desc(reviewsTable.publishedAt));
    res.json(
      reviews.map((r) => ({
        ...r,
        publishedAt: r.publishedAt.toISOString(),
        createdAt: r.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Error listing reviews");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/reviews/:id/reply", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const parsed = ReviewReplyBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: fromError(parsed.error).message });

    const [review] = await db
      .update(reviewsTable)
      .set({ reply: parsed.data.reply, isReplied: true })
      .where(eq(reviewsTable.id, id))
      .returning();

    if (!review) return res.status(404).json({ error: "Not found" });
    res.json({ ...review, publishedAt: review.publishedAt.toISOString(), createdAt: review.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Error replying to review");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
