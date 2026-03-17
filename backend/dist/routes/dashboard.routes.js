"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET /dashboard
router.get("/", auth_1.requireAuth, async (_req, res) => {
    const now = new Date();
    const startToday = new Date(now);
    startToday.setHours(0, 0, 0, 0);
    const endToday = new Date(now);
    endToday.setHours(23, 59, 59, 999);
    const next7 = new Date(now);
    next7.setDate(next7.getDate() + 7);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const [totalLeads, dueToday, dueNext7, upcoming, lettersThisMonth, emailRecontactsDue, closeLoopsDue, reactivationsDue, pausedLeads, doNotContactLeads, pipelineValue, wonValue, lostValue, activeDeals,] = await Promise.all([
        prisma_1.prisma.lead.count(),
        prisma_1.prisma.lead.count({
            where: {
                nextFollowUp: { gte: startToday, lte: endToday },
            },
        }),
        prisma_1.prisma.lead.count({
            where: {
                nextFollowUp: { gte: now, lte: next7 },
            },
        }),
        prisma_1.prisma.lead.findMany({
            where: {
                nextFollowUp: { not: null },
            },
            orderBy: { nextFollowUp: "asc" },
            take: 10,
            select: {
                id: true,
                businessName: true,
                city: true,
                leadTemperature: true,
                nextFollowUp: true,
            },
        }),
        prisma_1.prisma.letter.count({
            where: {
                sentDate: { gte: startOfMonth },
            },
        }),
        prisma_1.prisma.lead.count({
            where: {
                outreachStage: 1,
                nextOutreachDate: { lte: now },
                doNotContact: false,
                status: { not: "dnc" },
            },
        }),
        prisma_1.prisma.lead.count({
            where: {
                outreachStage: 2,
                nextOutreachDate: { lte: now },
                doNotContact: false,
                status: { not: "dnc" },
            },
        }),
        prisma_1.prisma.lead.count({
            where: {
                outreachStage: 3,
                nextOutreachDate: { lte: now },
                doNotContact: false,
                status: { not: "dnc" },
            },
        }),
        prisma_1.prisma.lead.count({
            where: {
                outreachPaused: true,
            },
        }),
        prisma_1.prisma.lead.count({
            where: {
                doNotContact: true,
            },
        }),
        prisma_1.prisma.deal.aggregate({
            _sum: {
                dealValue: true,
            },
            where: {
                stage: "proposed",
            },
        }),
        prisma_1.prisma.deal.aggregate({
            _sum: {
                dealValue: true,
            },
            where: {
                stage: "won",
            },
        }),
        prisma_1.prisma.deal.aggregate({
            _sum: {
                dealValue: true,
            },
            where: {
                stage: "lost",
            },
        }),
        prisma_1.prisma.deal.count({
            where: {
                stage: "proposed",
            },
        }),
    ]);
    res.json({
        totalLeads,
        dueToday,
        dueNext7,
        upcoming,
        lettersThisMonth,
        emailRecontactsDue,
        closeLoopsDue,
        reactivationsDue,
        pausedLeads,
        doNotContactLeads,
        pipelineValue: Number(pipelineValue._sum.dealValue ?? 0),
        wonValue: Number(wonValue._sum.dealValue ?? 0),
        lostValue: Number(lostValue._sum.dealValue ?? 0),
        activeDeals,
    });
});
exports.default = router;
