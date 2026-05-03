import { Router } from "express";
import { db } from "@workspace/db";
import {
  conversations as conversationsTable,
  messages as messagesTable,
  salesTable,
  customersTable,
  expensesTable,
  appointmentsTable,
} from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import { fromError } from "zod-validation-error";
import { z } from "zod";

const router = Router();

const CreateConversationBody = z.object({ title: z.string().default("New Chat") });
const SendMessageBody = z.object({ content: z.string().min(1) });

async function buildSystemPrompt() {
  const [revenueResult] = await db
    .select({ total: sql<number>`coalesce(sum(amount::numeric), 0)` })
    .from(salesTable)
    .where(sql`created_at >= current_date`);

  const [customerCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(customersTable);

  const [todayAppts] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(appointmentsTable)
    .where(sql`scheduled_at >= current_date and scheduled_at < current_date + interval '1 day'`);

  const topServices = await db
    .select({ service: salesTable.service, count: sql<number>`count(*)::int` })
    .from(salesTable)
    .groupBy(salesTable.service)
    .orderBy(sql`count(*) desc`)
    .limit(3);

  const [expenses] = await db
    .select({ total: sql<number>`coalesce(sum(amount::numeric), 0)` })
    .from(expensesTable);

  const todayRevenue = Number(revenueResult.total);
  const totalExpenses = Number(expenses.total);

  return `You are the Omni-Manager — the ultimate AI Business Growth Partner for Indian Retailers. You are the brain behind OmniStore AI.

LIVE BUSINESS DATA (as of right now):
- Today's Revenue: ₹${todayRevenue.toLocaleString("en-IN")}
- Total Customers: ${customerCount.count}
- Today's Appointments: ${todayAppts.count}
- Top Services: ${topServices.map((s) => `${s.service} (${s.count}x)`).join(", ")}
- Total Expenses Logged: ₹${totalExpenses.toLocaleString("en-IN")}
- Net Profit Estimate: ₹${(todayRevenue - totalExpenses).toLocaleString("en-IN")}

YOUR PERSONALITY:
- You speak in a warm mix of Hindi and English (Hinglish) — naturally, not forced
- You are data-driven, aggressive about growth, deeply understand Indian retail culture
- Your goal: ensure the shop is NEVER empty
- When footfall is low → suggest a promotion
- When a customer is loyal → treat them like royalty
- You are direct, actionable, and energetic
- You address the owner as "Malik" (boss) or "Sahib" occasionally to build rapport
- You celebrate wins enthusiastically: "Wah! Today's sales are rocking!"

CAPABILITIES YOU CAN HELP WITH:
- Analyze sales trends and dead zones
- Suggest WhatsApp campaign messages in Hinglish
- Recommend pricing strategies for services
- Give staff management advice
- Suggest how to improve footfall in cold zones
- Help write Google review replies
- Advise on loyalty program strategies
- General business Q&A for retail/salon/clinic owners

Always end your response with ONE specific, actionable next step the owner should take RIGHT NOW.`;
}

router.get("/openai/conversations", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(conversationsTable)
      .orderBy(desc(conversationsTable.createdAt));
    res.json(
      rows.map((c) => ({
        id: c.id,
        title: c.title,
        createdAt: c.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Error listing conversations");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/openai/conversations", async (req, res) => {
  try {
    const parsed = CreateConversationBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: fromError(parsed.error).message });

    const [conv] = await db
      .insert(conversationsTable)
      .values({ title: parsed.data.title })
      .returning();

    res.status(201).json({
      id: conv.id,
      title: conv.title,
      createdAt: conv.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Error creating conversation");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/openai/conversations/:id/messages", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const msgs = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.conversationId, id))
      .orderBy(messagesTable.createdAt);

    res.json(
      msgs.map((m) => ({
        id: m.id,
        conversationId: m.conversationId,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Error listing messages");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/openai/conversations/:id/messages", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const parsed = SendMessageBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: fromError(parsed.error).message });

    const [conv] = await db
      .select()
      .from(conversationsTable)
      .where(eq(conversationsTable.id, id));
    if (!conv) return res.status(404).json({ error: "Conversation not found" });

    await db.insert(messagesTable).values({
      conversationId: id,
      role: "user",
      content: parsed.data.content,
    });

    const history = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.conversationId, id))
      .orderBy(messagesTable.createdAt)
      .limit(20);

    const systemPrompt = await buildSystemPrompt();

    const chatMessages = [
      { role: "system" as const, content: systemPrompt },
      ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    ];

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    let fullResponse = "";
    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      max_completion_tokens: 4096,
      messages: chatMessages,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    await db.insert(messagesTable).values({
      conversationId: id,
      role: "assistant",
      content: fullResponse,
    });

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "Error sending message");
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    } else {
      res.write(`data: ${JSON.stringify({ error: "Stream error" })}\n\n`);
      res.end();
    }
  }
});

export default router;
