import { Router } from "express";
import { db } from "@workspace/db";
import { appointmentsTable, customersTable, staffTable } from "@workspace/db";
import { eq, gte, lte, and, sql } from "drizzle-orm";
import { fromError } from "zod-validation-error";
import { z } from "zod";

const router = Router();

const CreateAppointmentBody = z.object({
  customerId: z.number().int().optional().nullable(),
  staffId: z.number().int().optional().nullable(),
  service: z.string().min(1),
  notes: z.string().optional().nullable(),
  scheduledAt: z.string(),
  durationMinutes: z.number().int().default(60),
});

const UpdateAppointmentBody = z.object({
  status: z.enum(["scheduled", "completed", "cancelled", "no_show"]).optional(),
  notes: z.string().optional().nullable(),
  scheduledAt: z.string().optional().nullable(),
});

router.get("/appointments", async (req, res) => {
  try {
    const dateStr = req.query.date as string | undefined;

    let query = db
      .select({
        id: appointmentsTable.id,
        customerId: appointmentsTable.customerId,
        customerName: customersTable.name,
        customerPhone: customersTable.phone,
        staffId: appointmentsTable.staffId,
        staffName: staffTable.name,
        service: appointmentsTable.service,
        notes: appointmentsTable.notes,
        status: appointmentsTable.status,
        scheduledAt: appointmentsTable.scheduledAt,
        durationMinutes: appointmentsTable.durationMinutes,
        createdAt: appointmentsTable.createdAt,
      })
      .from(appointmentsTable)
      .leftJoin(customersTable, eq(appointmentsTable.customerId, customersTable.id))
      .leftJoin(staffTable, eq(appointmentsTable.staffId, staffTable.id))
      .orderBy(appointmentsTable.scheduledAt) as any;

    if (dateStr) {
      const date = new Date(dateStr);
      const next = new Date(date);
      next.setDate(next.getDate() + 1);
      query = db
        .select({
          id: appointmentsTable.id,
          customerId: appointmentsTable.customerId,
          customerName: customersTable.name,
          customerPhone: customersTable.phone,
          staffId: appointmentsTable.staffId,
          staffName: staffTable.name,
          service: appointmentsTable.service,
          notes: appointmentsTable.notes,
          status: appointmentsTable.status,
          scheduledAt: appointmentsTable.scheduledAt,
          durationMinutes: appointmentsTable.durationMinutes,
          createdAt: appointmentsTable.createdAt,
        })
        .from(appointmentsTable)
        .leftJoin(customersTable, eq(appointmentsTable.customerId, customersTable.id))
        .leftJoin(staffTable, eq(appointmentsTable.staffId, staffTable.id))
        .where(and(gte(appointmentsTable.scheduledAt, date), lte(appointmentsTable.scheduledAt, next)))
        .orderBy(appointmentsTable.scheduledAt);
    }

    const rows = await query;
    res.json(
      rows.map((r: any) => ({
        ...r,
        scheduledAt: r.scheduledAt.toISOString(),
        createdAt: r.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Error listing appointments");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/appointments", async (req, res) => {
  try {
    const parsed = CreateAppointmentBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: fromError(parsed.error).message });

    const [appt] = await db
      .insert(appointmentsTable)
      .values({
        customerId: parsed.data.customerId || null,
        staffId: parsed.data.staffId || null,
        service: parsed.data.service,
        notes: parsed.data.notes || null,
        status: "scheduled",
        scheduledAt: new Date(parsed.data.scheduledAt),
        durationMinutes: parsed.data.durationMinutes,
      })
      .returning();

    res.status(201).json({
      ...appt,
      customerName: null,
      customerPhone: null,
      staffName: null,
      scheduledAt: appt.scheduledAt.toISOString(),
      createdAt: appt.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Error creating appointment");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/appointments/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const parsed = UpdateAppointmentBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: fromError(parsed.error).message });

    const updates: Record<string, any> = {};
    if (parsed.data.status) updates.status = parsed.data.status;
    if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes;
    if (parsed.data.scheduledAt) updates.scheduledAt = new Date(parsed.data.scheduledAt);

    const [appt] = await db
      .update(appointmentsTable)
      .set(updates)
      .where(eq(appointmentsTable.id, id))
      .returning();

    if (!appt) return res.status(404).json({ error: "Not found" });

    res.json({
      ...appt,
      customerName: null,
      customerPhone: null,
      staffName: null,
      scheduledAt: appt.scheduledAt.toISOString(),
      createdAt: appt.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Error updating appointment");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/appointments/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    await db.delete(appointmentsTable).where(eq(appointmentsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting appointment");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
