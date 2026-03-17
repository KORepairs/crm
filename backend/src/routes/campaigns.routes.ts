import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();

// GET /campaigns
router.get("/", requireAuth, async (_req, res) => {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { startDate: "desc" },
    include: {
      _count: {
        select: {
          leadCampaigns: true,
        },
      },
    },
  });

  res.json(campaigns);
});

// POST /campaigns
router.post("/", requireAuth, async (req, res) => {
  const { name, targetCategory, offerType, startDate, endDate } = req.body as {
    name?: unknown;
    targetCategory?: unknown;
    offerType?: unknown;
    startDate?: unknown;
    endDate?: unknown;
  };

  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ message: "name is required" });
  }

  const created = await prisma.campaign.create({
    data: {
      name: name.trim(),
      targetCategory:
        typeof targetCategory === "string" && targetCategory.trim()
          ? targetCategory.trim()
          : null,
      offerType:
        typeof offerType === "string" && offerType.trim()
          ? offerType.trim()
          : null,
      startDate:
        typeof startDate === "string" && startDate
          ? new Date(startDate)
          : null,
      endDate:
        typeof endDate === "string" && endDate
          ? new Date(endDate)
          : null,
    },
  });

  res.status(201).json(created);
});

// POST /campaigns/:id/leads
router.post("/:id/leads", requireAuth, async (req, res) => {
  const campaignId = String(req.params.id);
  const { leadIds } = req.body as { leadIds?: unknown };

  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    return res.status(400).json({ message: "leadIds array is required" });
  }

  const rows = leadIds
    .filter((id): id is string => typeof id === "string" && !!id)
    .map((leadId) => ({
      leadId,
      campaignId,
    }));

  if (rows.length === 0) {
    return res.status(400).json({ message: "No valid leadIds supplied" });
  }

  await prisma.leadCampaign.createMany({
    data: rows,
    skipDuplicates: true,
  });

  const updatedCampaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      _count: {
        select: {
          leadCampaigns: true,
        },
      },
    },
  });

  res.json(updatedCampaign);
});

// GET /campaigns/:id
router.get("/:id", requireAuth, async (req, res) => {
  const campaign = await prisma.campaign.findUnique({
    where: { id: String(req.params.id) },
    include: {
      leadCampaigns: {
        include: {
          lead: {
            select: {
              id: true,
              businessName: true,
              city: true,
              status: true,
              leadTemperature: true,
            },
          },
        },
      },
    },
  });

  if (!campaign) {
    return res.status(404).json({ message: "Campaign not found" });
  }

  res.json(campaign);
});

export default router;