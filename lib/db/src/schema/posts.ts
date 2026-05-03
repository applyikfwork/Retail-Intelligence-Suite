import { pgTable, serial, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const postStatusEnum = pgEnum("post_status", ["draft", "published", "scheduled"]);

export const socialPostsTable = pgTable("social_posts", {
  id: serial("id").primaryKey(),
  caption: text("caption").notNull(),
  imageUrl: text("image_url"),
  platforms: text("platforms").array().notNull().default(["instagram"]),
  status: postStatusEnum("status").notNull().default("draft"),
  likes: integer("likes").notNull().default(0),
  reach: integer("reach").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSocialPostSchema = createInsertSchema(socialPostsTable).omit({ id: true, createdAt: true, likes: true, reach: true });
export type InsertSocialPost = z.infer<typeof insertSocialPostSchema>;
export type SocialPost = typeof socialPostsTable.$inferSelect;
