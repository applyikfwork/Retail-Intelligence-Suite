import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { fromError } from "zod-validation-error";
import { z } from "zod";

const router = Router();

const CampaignSuggestionsBody = z.object({
  deadZoneLabel: z.string(),
  discountPercent: z.number().int(),
  targetTier: z.string(),
  service: z.string(),
});

router.post("/campaigns/suggestions", async (req, res) => {
  try {
    const parsed = CampaignSuggestionsBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: fromError(parsed.error).message });

    const { deadZoneLabel, discountPercent, targetTier, service } = parsed.data;

    const prompt = `You are a WhatsApp marketing expert for Indian salons and retail shops. Generate 3 compelling campaign messages in Hinglish (mix of Hindi and English) for a WhatsApp blast.

Context:
- Dead zone time: ${deadZoneLabel}
- Service to promote: ${service}
- Discount offered: ${discountPercent}%
- Target customer tier: ${targetTier} customers

Requirements:
- Each message should be 1-2 sentences max (WhatsApp-friendly length)
- Use Hinglish naturally (not forced translation)
- Include urgency and excitement
- Include the discount clearly
- End with a clear call to action (e.g., "Reply BOOK", "Call now", "Walk in abhi")
- Make it feel personal and warm, not like spam
- Use [Name] as placeholder for customer name

Return ONLY a JSON array of 3 strings, no other text. Example format:
["message 1", "message 2", "message 3"]`;

    const response = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.choices[0]?.message?.content || '["Unable to generate suggestions"]';
    let suggestions: string[];
    try {
      suggestions = JSON.parse(raw);
    } catch {
      suggestions = [raw];
    }

    res.json({ suggestions });
  } catch (err) {
    req.log.error({ err }, "Error generating campaign suggestions");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
