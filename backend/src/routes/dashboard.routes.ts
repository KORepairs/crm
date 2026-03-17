import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();

// GET /dashboard
router.get("/", requireAuth, async (_req, res) => {
  const now = new Date();

  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);

  const endToday = new Date(now);
  endToday.setHours(23, 59, 59, 999);

  const next7 = new Date(now);
  next7.setDate(next7.getDate() + 7);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
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
    pipelineValue,
    wonValue,
    lostValue,
    activeDeals,
  ] = await Promise.all([
    prisma.lead.count(),

    prisma.lead.count({
      where: {
        nextFollowUp: { gte: startToday, lte: endToday },
      },
    }),

    prisma.lead.count({
      where: {
        nextFollowUp: { gte: now, lte: next7 },
      },
    }),

    prisma.lead.findMany({
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

    prisma.letter.count({
      where: {
        sentDate: { gte: startOfMonth },
      },
    }),

    prisma.lead.count({
      where: {
        outreachStage: 1,
        nextOutreachDate: { lte: now },
        doNotContact: false,
        status: { not: "dnc" },
      },
    }),

    prisma.lead.count({
      where: {
        outreachStage: 2,
        nextOutreachDate: { lte: now },
        doNotContact: false,
        status: { not: "dnc" },
      },
    }),

    prisma.lead.count({
      where: {
        outreachStage: 3,
        nextOutreachDate: { lte: now },
        doNotContact: false,
        status: { not: "dnc" },
      },
    }),

    prisma.lead.count({
      where: {
        outreachPaused: true,
      },
    }),

    prisma.lead.count({
      where: {
        doNotContact: true,
      },
    }),

    prisma.deal.aggregate({
      _sum: {
        dealValue: true,
      },
      where: {
        stage: "proposed",
      },
    }),

    prisma.deal.aggregate({
      _sum: {
        dealValue: true,
      },
      where: {
        stage: "won",
      },
    }),

    prisma.deal.aggregate({
      _sum: {
        dealValue: true,
      },
      where: {
        stage: "lost",
      },
    }),

    prisma.deal.count({
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

export default router;