import { Router } from "express";
import { db } from "@workspace/db";
import { customersTable, loyaltyCardsTable } from "@workspace/db";
import { CreateCustomerBody } from "@workspace/api-zod";
import { eq, ilike, or, sql, desc } from "drizzle-orm";
import { fromError } from "zod-validation-error";
import { randomUUID } from "crypto";

const router = Router();

router.get("/customers", async (req, res) => {
  try {
    const search = req.query.search as string | undefined;
    const tier = req.query.tier as string | undefined;

    let query = db.select().from(customersTable).orderBy(desc(customersTable.totalSpend)) as any;

    const conditions = [];
    if (search) {
      conditions.push(
        or(
          ilike(customersTable.name, `%${search}%`),
          ilike(customersTable.phone, `%${search}%`)
        )
      );
    }
    if (tier && tier !== "all") {
      conditions.push(eq(customersTable.tier, tier as any));
    }

    const customers =
      conditions.length > 0
        ? await db
            .select()
            .from(customersTable)
            .where(conditions.length === 1 ? conditions[0] : sql`${conditions[0]} and ${conditions[1]}`)
            .orderBy(desc(customersTable.totalSpend))
        : await db.select().from(customersTable).orderBy(desc(customersTable.totalSpend));

    res.json(
      customers.map((c) => ({
        ...c,
        totalSpend: Number(c.totalSpend),
        lastVisit: c.lastVisit?.toISOString() || null,
        createdAt: c.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Error listing customers");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/customers", async (req, res) => {
  try {
    const parsed = CreateCustomerBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: fromError(parsed.error).message });
    }

    const [customer] = await db
      .insert(customersTable)
      .values({
        name: parsed.data.name,
        phone: parsed.data.phone,
        email: parsed.data.email || null,
      })
      .returning();

    await db.insert(loyaltyCardsTable).values({
      customerId: customer.id,
      qrCode: `OMNI-${customer.id}-${randomUUID().slice(0, 8).toUpperCase()}`,
    });

    res.status(201).json({
      ...customer,
      totalSpend: Number(customer.totalSpend),
      lastVisit: null,
      createdAt: customer.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Error creating customer");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/customers/top-loyal", async (req, res) => {
  try {
    const customers = await db
      .select()
      .from(customersTable)
      .orderBy(desc(customersTable.totalSpend))
      .limit(10);

    res.json(
      customers.map((c) => ({
        ...c,
        totalSpend: Number(c.totalSpend),
        lastVisit: c.lastVisit?.toISOString() || null,
        createdAt: c.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Error fetching top loyal customers");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/customers/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, id));
    if (!customer) return res.status(404).json({ error: "Customer not found" });

    res.json({
      ...customer,
      totalSpend: Number(customer.totalSpend),
      lastVisit: customer.lastVisit?.toISOString() || null,
      createdAt: customer.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching customer");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
