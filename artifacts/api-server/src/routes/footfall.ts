import { Router } from "express";
import { db } from "@workspace/db";
import { footfallZonesTable } from "@workspace/db";

const router = Router();

router.get("/footfall/heatmap", async (req, res) => {
  try {
    const zones = await db.select().from(footfallZonesTable);

    res.json({
      zones: zones.map((z) => ({
        id: z.zoneId,
        label: z.label,
        x: Number(z.x),
        y: Number(z.y),
        width: Number(z.width),
        height: Number(z.height),
        intensity: Number(z.intensity),
        visitors: z.visitors,
        conversionRate: Number(z.conversionRate),
        alert: z.alert,
      })),
      lastUpdated: new Date().toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching footfall heatmap");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/footfall/insights", async (req, res) => {
  try {
    const zones = await db.select().from(footfallZonesTable);

    const insights = zones
      .filter((z) => z.alert)
      .map((z, i) => ({
        id: i + 1,
        type:
          Number(z.intensity) > 0.7 && Number(z.conversionRate) < 10
            ? ("warning" as const)
            : Number(z.intensity) > 0.7
            ? ("success" as const)
            : ("opportunity" as const),
        zone: z.label,
        message: z.alert!,
        actionSuggested:
          Number(z.intensity) > 0.7 && Number(z.conversionRate) < 10
            ? "Check pricing and signage in this zone"
            : null,
      }));

    res.json(insights);
  } catch (err) {
    req.log.error({ err }, "Error fetching footfall insights");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
