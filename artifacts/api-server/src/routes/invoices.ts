import { Router } from "express";
import { db } from "@workspace/db";
import { invoicesTable } from "@workspace/db";
import { desc } from "drizzle-orm";
import { fromError } from "zod-validation-error";
import { z } from "zod";

const router = Router();

const InvoiceLineItem = z.object({
  name: z.string(),
  quantity: z.number().int().default(1),
  price: z.number(),
  total: z.number(),
});

const CreateInvoiceBody = z.object({
  customerId: z.number().int().optional().nullable(),
  customerName: z.string().min(1),
  customerPhone: z.string().min(1),
  items: z.array(InvoiceLineItem),
  discountAmount: z.number().default(0),
  taxRate: z.number().default(0),
});

function parseItems(s: string) {
  try { return JSON.parse(s); } catch { return []; }
}

function toInvoice(inv: any) {
  return {
    ...inv,
    items: parseItems(inv.items),
    subtotal: Number(inv.subtotal),
    discountAmount: Number(inv.discountAmount),
    taxAmount: Number(inv.taxAmount),
    total: Number(inv.total),
    createdAt: inv.createdAt.toISOString(),
  };
}

router.get("/invoices", async (req, res) => {
  try {
    const invoices = await db.select().from(invoicesTable).orderBy(desc(invoicesTable.createdAt));
    res.json(invoices.map(toInvoice));
  } catch (err) {
    req.log.error({ err }, "Error listing invoices");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/invoices", async (req, res) => {
  try {
    const parsed = CreateInvoiceBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: fromError(parsed.error).message });

    const subtotal = parsed.data.items.reduce((sum, item) => sum + item.total, 0);
    const discountAmount = parsed.data.discountAmount || 0;
    const taxAmount = ((subtotal - discountAmount) * (parsed.data.taxRate || 0)) / 100;
    const total = subtotal - discountAmount + taxAmount;

    const count = await db.select().from(invoicesTable);
    const invoiceNumber = `INV-${String(count.length + 1).padStart(4, "0")}-${new Date().getFullYear()}`;
    const qrCode = `OMNI-INV-${invoiceNumber}`;

    const [invoice] = await db
      .insert(invoicesTable)
      .values({
        invoiceNumber,
        customerId: parsed.data.customerId || null,
        saleId: null,
        customerName: parsed.data.customerName,
        customerPhone: parsed.data.customerPhone,
        items: JSON.stringify(parsed.data.items),
        subtotal: String(subtotal),
        discountAmount: String(discountAmount),
        taxAmount: String(taxAmount),
        total: String(total),
        status: "paid",
        qrCode,
      })
      .returning();

    res.status(201).json(toInvoice(invoice));
  } catch (err) {
    req.log.error({ err }, "Error creating invoice");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
