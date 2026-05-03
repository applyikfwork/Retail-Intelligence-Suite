import { pgTable, serial, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const campaignStatusEnum = pgEnum("campaign_status", ["draft", "sent", "scheduled"]);
export const campaignTargetTierEnum = pgEnum("campaign_target_tier", ["all", "vip", "regular"]);

export const campaignsTable = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  discountPercent: integer("discount_percent"),
  targetTier: campaignTargetTierEnum("target_tier").notNull().default("all"),
  sentCount: integer("sent_count").notNull().default(0),
  responseCount: integer("response_count").notNull().default(0),
  status: campaignStatusEnum("status").notNull().default("draft"),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCampaignSchema = createInsertSchema(campaignsTable).omit({ id: true, createdAt: true, sentCount: true, responseCount: true });
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type Campaign = typeof campaignsTable.$inferSelect;
