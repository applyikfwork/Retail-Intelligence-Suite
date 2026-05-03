import { pgTable, serial, text, numeric, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const footfallZonesTable = pgTable("footfall_zones", {
  id: serial("id").primaryKey(),
  zoneId: text("zone_id").notNull().unique(),
  label: text("label").notNull(),
  x: numeric("x", { precision: 5, scale: 2 }).notNull(),
  y: numeric("y", { precision: 5, scale: 2 }).notNull(),
  width: numeric("width", { precision: 5, scale: 2 }).notNull(),
  height: numeric("height", { precision: 5, scale: 2 }).notNull(),
  intensity: numeric("intensity", { precision: 4, scale: 3 }).notNull().default("0"),
  visitors: integer("visitors").notNull().default(0),
  conversionRate: numeric("conversion_rate", { precision: 5, scale: 2 }).notNull().default("0"),
  alert: text("alert"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFootfallZoneSchema = createInsertSchema(footfallZonesTable).omit({ id: true });
export type InsertFootfallZone = z.infer<typeof insertFootfallZoneSchema>;
export type FootfallZone = typeof footfallZonesTable.$inferSelect;
