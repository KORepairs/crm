"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
function isDealStage(v) {
    return v === "proposed" || v === "won" || v === "lost";
}
function isServiceType(v) {
    return v === "Website" || v === "SEO" || v === "Hosting" || v === "Audit";
}
// GET /deals
router.get("/", auth_1.requireAuth, async (_req, res) => {
    const deals = await prisma_1.prisma.deal.findMany({
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
router.post("/", auth_1.requireAuth, async (req, res) => {
    const { leadId, serviceType, dealValue, stage, closeDate } = req.body;
    if (!leadId || typeof leadId !== "string") {
        return res.status(400).json({ message: "leadId is required" });
    }
    if (!isServiceType(serviceType)) {
        return res.status(400).json({ message: "valid serviceType is required" });
    }
    const numericDealValue = typeof dealValue === "number"
        ? dealValue
        : typeof dealValue === "string"
            ? Number(dealValue)
            : NaN;
    if (Number.isNaN(numericDealValue) || numericDealValue <= 0) {
        return res.status(400).json({ message: "dealValue must be a positive number" });
    }
    const lead = await prisma_1.prisma.lead.findUnique({
        where: { id: leadId },
    });
    if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
    }
    const created = await prisma_1.prisma.deal.create({
        data: {
            leadId,
            serviceType,
            dealValue: numericDealValue,
            stage: isDealStage(stage) ? stage : "proposed",
            closeDate: typeof closeDate === "string" && closeDate
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
router.put("/:id", auth_1.requireAuth, async (req, res) => {
    const { serviceType, dealValue, stage, closeDate } = req.body;
    const data = {};
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
    const updated = await prisma_1.prisma.deal.update({
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
router.delete("/:id", auth_1.requireAuth, async (req, res) => {
    await prisma_1.prisma.deal.delete({
        where: { id: String(req.params.id) },
    });
    res.json({ ok: true });
});
exports.default = router;
