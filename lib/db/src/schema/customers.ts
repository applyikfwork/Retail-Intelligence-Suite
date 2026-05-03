import { pgTable, serial, text, numeric, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const customerTierEnum = pgEnum("customer_tier", ["vip", "regular", "new"]);

export const customersTable = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(),
  email: text("email"),
  tier: customerTierEnum("tier").notNull().default("new"),
  totalSpend: numeric("total_spend", { precision: 10, scale: 2 }).notNull().default("0"),
  visitCount: integer("visit_count").notNull().default(0),
  loyaltyScanCount: integer("loyalty_scan_count").notNull().default(0),
  lastVisit: timestamp("last_visit", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCustomerSchema = createInsertSchema(customersTable).omit({ id: true, createdAt: true });
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customersTable.$inferSelect;
