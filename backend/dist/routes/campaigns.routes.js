"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET /campaigns
router.get("/", auth_1.requireAuth, async (_req, res) => {
    const campaigns = await prisma_1.prisma.campaign.findMany({
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
router.post("/", auth_1.requireAuth, async (req, res) => {
    const { name, targetCategory, offerType, startDate, endDate } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ message: "name is required" });
    }
    const created = await prisma_1.prisma.campaign.create({
        data: {
            name: name.trim(),
            targetCategory: typeof targetCategory === "string" && targetCategory.trim()
                ? targetCategory.trim()
                : null,
            offerType: typeof offerType === "string" && offerType.trim()
                ? offerType.trim()
                : null,
            startDate: typeof startDate === "string" && startDate
                ? new Date(startDate)
                : null,
            endDate: typeof endDate === "string" && endDate
                ? new Date(endDate)
                : null,
        },
    });
    res.status(201).json(created);
});
// POST /campaigns/:id/leads
router.post("/:id/leads", auth_1.requireAuth, async (req, res) => {
    const campaignId = String(req.params.id);
    const { leadIds } = req.body;
    if (!Array.isArray(leadIds) || leadIds.length === 0) {
        return res.status(400).json({ message: "leadIds array is required" });
    }
    const rows = leadIds
        .filter((id) => typeof id === "string" && !!id)
        .map((leadId) => ({
        leadId,
        campaignId,
    }));
    if (rows.length === 0) {
        return res.status(400).json({ message: "No valid leadIds supplied" });
    }
    await prisma_1.prisma.leadCampaign.createMany({
        data: rows,
        skipDuplicates: true,
    });
    const updatedCampaign = await prisma_1.prisma.campaign.findUnique({
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
router.get("/:id", auth_1.requireAuth, async (req, res) => {
    const campaign = await prisma_1.prisma.campaign.findUnique({
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
exports.default = router;
