import { Router } from "express";
import { db } from "@workspace/db";
import { socialPostsTable } from "@workspace/db";
import { CreatePostBody } from "@workspace/api-zod";
import { desc } from "drizzle-orm";
import { fromError } from "zod-validation-error";

const router = Router();

router.get("/posts", async (req, res) => {
  try {
    const posts = await db.select().from(socialPostsTable).orderBy(desc(socialPostsTable.createdAt));

    res.json(
      posts.map((p) => ({
        ...p,
        createdAt: p.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Error listing posts");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/posts", async (req, res) => {
  try {
    const parsed = CreatePostBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: fromError(parsed.error).message });
    }

    const localKeywords: string[] = parsed.data.localKeywords || [];
    let caption = parsed.data.caption;
    if (localKeywords.length > 0) {
      const hashtags = localKeywords.map((kw) => `#${kw.replace(/\s+/g, "")}`).join(" ");
      caption = `${caption}\n\n${hashtags}`;
    }

    const [post] = await db
      .insert(socialPostsTable)
      .values({
        caption,
        imageUrl: parsed.data.imageUrl || null,
        platforms: parsed.data.platforms,
        status: "published",
        likes: 0,
        reach: Math.floor(Math.random() * 500) + 100,
      })
      .returning();

    res.status(201).json({
      ...post,
      createdAt: post.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Error creating post");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
