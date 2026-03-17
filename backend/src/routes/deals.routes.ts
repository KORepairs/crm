import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();

function isDealStage(v: unknown): v is "proposed" | "won" | "lost" {
  return v === "proposed" || v === "won" || v === "lost";
}

function isServiceType(v: unknown): v is "Website" | "SEO" | "Hosting" | "Audit" {
  return v === "Website" || v === "SEO" || v === "Hosting" || v === "Audit";
}

// GET /deals
router.get("/", requireAuth, async (_req, res) => {
  const deals = await prisma.deal.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      lead: {
        select: {
          id: true,
          businessName: true,
          city: true,
        },
      },
    },
  });

  res.json(deals);
});

// POST /deals
router.post("/", requireAuth, async (req, res) => {
  const { leadId, serviceType, dealValue, stage, closeDate } = req.body as {
    leadId?: unknown;
    serviceType?: unknown;
    dealValue?: unknown;
    stage?: unknown;
    closeDate?: unknown;
  };

  if (!leadId || typeof leadId !== "string") {
    return res.status(400).json({ message: "leadId is required" });
  }

  if (!isServiceType(serviceType)) {
    return res.status(400).json({ message: "valid serviceType is required" });
  }

  const numericDealValue =
    typeof dealValue === "number"
      ? dealValue
      : typeof dealValue === "string"
        ? Number(dealValue)
        : NaN;

  if (Number.isNaN(numericDealValue) || numericDealValue <= 0) {
    return res.status(400).json({ message: "dealValue must be a positive number" });
  }

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
  });

  if (!lead) {
    return res.status(404).json({ message: "Lead not found" });
  }

  const created = await prisma.deal.create({
    data: {
      leadId,
      serviceType,
      dealValue: numericDealValue,
      stage: isDealStage(stage) ? stage : "proposed",
      closeDate:
        typeof closeDate === "string" && closeDate
          ? new Date(closeDate)
          : null,
    },
    include: {
      lead: {
        select: {
          id: true,
          businessName: true,
          city: true,
        },
      },
    },
  });

  res.status(201).json(created);
});

// PUT /deals/:id
router.put("/:id", requireAuth, async (req, res) => {
  const { serviceType, dealValue, stage, closeDate } = req.body as {
    serviceType?: unknown;
    dealValue?: unknown;
    stage?: unknown;
    closeDate?: unknown;
  };

  const data: {
    serviceType?: "Website" | "SEO" | "Hosting" | "Audit";
    dealValue?: number;
    stage?: "proposed" | "won" | "lost";
    closeDate?: Date | null;
  } = {};

  if (isServiceType(serviceType)) {
    data.serviceType = serviceType;
  }

  if (typeof dealValue === "number" && dealValue > 0) {
    data.dealValue = dealValue;
  }

  if (typeof dealValue === "string" && dealValue.trim()) {
    const parsed = Number(dealValue);
    if (!Number.isNaN(parsed) && parsed > 0) {
      data.dealValue = parsed;
    }
  }

  if (isDealStage(stage)) {
    data.stage = stage;
  }

  if (typeof closeDate === "string") {
    data.closeDate = closeDate ? new Date(closeDate) : null;
  }

  const updated = await prisma.deal.update({
    where: { id: String(req.params.id) },
    data,
    include: {
      lead: {
        select: {
          id: true,
          businessName: true,
          city: true,
        },
      },
    },
  });

  res.json(updated);
});

// DELETE /deals/:id
router.delete("/:id", requireAuth, async (req, res) => {
  await prisma.deal.delete({
    where: { id: String(req.params.id) },
  });

  res.json({ ok: true });
});

export default router;
