import { pgTable, serial, integer, boolean, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { customersTable } from "./customers";

export const loyaltyCardsTable = pgTable("loyalty_cards", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => customersTable.id),
  scanCount: integer("scan_count").notNull().default(0),
  freeSessionEarned: boolean("free_session_earned").notNull().default(false),
  freeSessionRedeemed: boolean("free_session_redeemed").notNull().default(false),
  qrCode: text("qr_code").notNull().unique(),
  lastScan: timestamp("last_scan", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertLoyaltyCardSchema = createInsertSchema(loyaltyCardsTable).omit({ id: true, createdAt: true });
export type InsertLoyaltyCard = z.infer<typeof insertLoyaltyCardSchema>;
export type LoyaltyCard = typeof loyaltyCardsTable.$inferSelect;
