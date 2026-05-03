import { Router } from "express";
import { db } from "@workspace/db";
import { inventoryTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { fromError } from "zod-validation-error";
import { z } from "zod";

const router = Router();

const CreateInventoryBody = z.object({
  name: z.string().min(1),
  category: z.string().default("Service"),
  price: z.number().positive(),
  costPrice: z.number().default(0),
  stock: z.number().int().default(0),
  lowStockThreshold: z.number().int().default(5),
  isService: z.boolean().default(true),
  description: z.string().optional().nullable(),
});

const UpdateInventoryBody = z.object({
  price: z.number().optional().nullable(),
  stock: z.number().int().optional().nullable(),
  isActive: z.boolean().optional().nullable(),
});

function toItem(i: any) {
  const price = Number(i.price);
  const costPrice = Number(i.costPrice);
  return {
    ...i,
    price,
    costPrice,
    margin: price > 0 ? Math.round(((price - costPrice) / price) * 100) : 0,
    isLowStock: !i.isService && i.stock <= i.lowStockThreshold,
    createdAt: i.createdAt.toISOString(),
  };
}

router.get("/inventory", async (req, res) => {
  try {
    const items = await db.select().from(inventoryTable).orderBy(sql`is_active desc, category, name`);
    res.json(items.map(toItem));
  } catch (err) {
    req.log.error({ err }, "Error listing inventory");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/inventory", async (req, res) => {
  try {
    const parsed = CreateInventoryBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: fromError(parsed.error).message });

    const [item] = await db
      .insert(inventoryTable)
      .values({
        name: parsed.data.name,
        category: parsed.data.category,
        price: String(parsed.data.price),
        costPrice: String(parsed.data.costPrice),
        stock: parsed.data.stock,
        lowStockThreshold: parsed.data.lowStockThreshold,
        isService: parsed.data.isService,
        description: parsed.data.description || null,
      })
      .returning();

    res.status(201).json(toItem(item));
  } catch (err) {
    req.log.error({ err }, "Error creating inventory item");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/inventory/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const parsed = UpdateInventoryBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: fromError(parsed.error).message });

    const updates: Record<string, any> = {};
    if (parsed.data.price != null) updates.price = String(parsed.data.price);
    if (parsed.data.stock != null) updates.stock = parsed.data.stock;
    if (parsed.data.isActive != null) updates.isActive = parsed.data.isActive;

    const [item] = await db.update(inventoryTable).set(updates).where(eq(inventoryTable.id, id)).returning();
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(toItem(item));
  } catch (err) {
    req.log.error({ err }, "Error updating inventory item");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
