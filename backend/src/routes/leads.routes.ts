import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, type AuthedRequest } from "../middleware/auth";const router = Router();

function normalizeName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9 ]/g, "");
}

function normalizeWebsiteDomain(website: string) {
  try {
    const withProtocol = website.startsWith("http://") || website.startsWith("https://")
      ? website
      : `https://${website}`;

    const hostname = new URL(withProtocol).hostname.toLowerCase();

    return hostname.replace(/^www\./, "");
  } catch {
    return website.trim().toLowerCase().replace(/^www\./, "");
  }
}

function isLeadStatus(v: unknown): v is "active" | "paused" | "dnc" {
  return v === "active" || v === "paused" || v === "dnc";
}

function isLeadTemperature(v: unknown): v is "cold" | "warm" | "hot" {
  return v === "cold" || v === "warm" || v === "hot";
}

function isActivityType(
  v: unknown
): v is
  | "call"
  | "email"
  | "meeting"
  | "visit"
  | "quote"
  | "follow_up"
  | "note"
  | "text"
  | "letter" {
  return (
    v === "call" ||
    v === "email" ||
    v === "meeting" ||
    v === "visit" ||
    v === "quote" ||
    v === "follow_up" ||
    v === "note" ||
    v === "text" ||
    v === "letter"
  );
}

function isLetterMethod(v: unknown): v is "post" | "hand_delivered" {
  return v === "post" || v === "hand_delivered";
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function getLeadTemperatureFromStage(stage: number): "cold" | "warm" | "hot" {
  if (stage >= 3) return "hot";
  if (stage >= 1) return "warm";
  return "cold";
}

function addToScore(currentScore: number | null | undefined, points: number) {
  return (currentScore ?? 0) + points;
}

// GET /leads?search=&temp=&sort=&status=
router.get("/", requireAuth, async (req, res) => {
  const search = (req.query.search as string | undefined)?.trim();
  const temp = (req.query.temp as string | undefined)?.trim();
  const sort = (req.query.sort as string | undefined)?.trim();
  const status = (req.query.status as string | undefined)?.trim();
  const outreachStage = (req.query.outreachStage as string | undefined)?.trim();
  const letterSent = (req.query.letterSent as string | undefined)?.trim();
  const reactivationDue = (req.query.reactivationDue as string | undefined)?.trim();

  const where: Prisma.LeadWhereInput = {};

  if (status === "all") {
    // no filter
  } else if (status && isLeadStatus(status)) {
    where.status = status;
  } else {
    where.status = "active";
  }

  if (search) {
    where.OR = [
      { businessName: { contains: search, mode: "insensitive" } },
      { city: { contains: search, mode: "insensitive" } },
    ];
  }

  if (temp && isLeadTemperature(temp)) {
    where.leadTemperature = temp;
  }

  if (outreachStage && !Number.isNaN(Number(outreachStage))) {
  where.outreachStage = Number(outreachStage);
}

if (letterSent === "yes") {
  where.outreachStage = { gte: 1 };
}

if (letterSent === "no") {
  where.outreachStage = 0;
}

if (reactivationDue === "yes") {
  where.outreachStage = 3;
  where.nextOutreachDate = { lte: new Date() };
}

  let orderBy: Prisma.LeadOrderByWithRelationInput = { createdAt: "desc" };
  if (sort === "oldest") orderBy = { createdAt: "asc" };
  if (sort === "score") orderBy = { score: "desc" };
  if (sort === "name") orderBy = { businessNameNormalized: "asc" };

  const leads = await prisma.lead.findMany({
    where,
    orderBy,
    take: 100,
  });

  res.json(leads);
});

// POST /leads
router.post("/", requireAuth, async (req, res) => {
  const {
    businessName,
    city,
    email,
    phone,
    website,
    postcode,
    notes,
    leadTemperature,
    status,
  } = req.body as {
    businessName?: unknown;
    city?: unknown;
    email?: unknown;
    phone?: unknown;
    website?: unknown;
    postcode?: unknown;
    notes?: unknown;
    leadTemperature?: unknown;
    status?: unknown;
  };

  if (!businessName || typeof businessName !== "string") {
    return res.status(400).json({ message: "businessName is required" });
  }

    const normalizedWebsiteDomain =
    typeof website === "string" && website.trim()
      ? normalizeWebsiteDomain(website)
      : null;

    const normalizedBusinessName = normalizeName(businessName);
    const normalizedPostcode =
      typeof postcode === "string" && postcode.trim()
        ? postcode.trim().toLowerCase().replace(/\s+/g, "")
        : null;

  if (normalizedWebsiteDomain) {
    const existingLead = await prisma.lead.findFirst({
      where: {
        websiteDomain: normalizedWebsiteDomain,
      },
    });

    if (existingLead) {
      return res.status(409).json({
        message: "A lead with this website already exists",
      });
    }
  }


if (normalizedPostcode) {
  const existingLeadByNameAndPostcode = await prisma.lead.findFirst({
    where: {
      businessNameNormalized: normalizedBusinessName,
      postcode: {
        equals: normalizedPostcode,
        mode: "insensitive",
      }
    },
  });

  if (typeof city === "string" && city.trim()) {
  const existingLeadByNameAndCity = await prisma.lead.findFirst({
    where: {
      businessNameNormalized: normalizedBusinessName,
      city: {
        equals: city,
        mode: "insensitive",
      },
    },
  });

  if (existingLeadByNameAndCity) {
    return res.status(409).json({
      message: "A lead with this business name and city already exists",
    });
  }
}

if (typeof phone === "string" && phone.trim()) {
  const existingLeadByNameAndPhone = await prisma.lead.findFirst({
    where: {
      businessNameNormalized: normalizedBusinessName,
      phone: {
        equals: phone,
        mode: "insensitive",
      },
    },
  });

  if (existingLeadByNameAndPhone) {
    return res.status(409).json({
      message: "A lead with this business name and phone already exists",
    });
  }
}

  if (existingLeadByNameAndPostcode) {
    return res.status(409).json({
      message: "A lead with this business name and postcode already exists",
    });
  }
}

  const created = await prisma.lead.create({
    data: {
      businessName,
      businessNameNormalized: normalizedBusinessName,
      city: typeof city === "string" ? city : null,
      email: typeof email === "string" ? email : null,
      phone: typeof phone === "string" ? phone : null,
      website: typeof website === "string" ? website : null,
      websiteDomain: normalizedWebsiteDomain,
      postcode: typeof postcode === "string" ? postcode : null,
      notes: typeof notes === "string" ? notes : null,
      leadTemperature: isLeadTemperature(leadTemperature)
        ? leadTemperature
        : "cold",
      status: isLeadStatus(status) ? status : "active",
      score: 0,
    },
  });

  res.status(201).json(created);
});

// GET /leads/followups
router.get("/followups", requireAuth, async (_req, res) => {
  const now = new Date();

  const leads = await prisma.lead.findMany({
    where: {
      status: "active",
      nextFollowUp: { not: null, gte: now },
    },
    orderBy: { nextFollowUp: "asc" },
    take: 20,
  });

  res.json(leads);
});

// GET /leads/followups/due
router.get("/followups/due", requireAuth, async (_req, res) => {
  const now = new Date();

  const leads = await prisma.lead.findMany({
    where: {
      status: "active",
      nextFollowUp: { not: null, lte: now },
    },
    orderBy: { nextFollowUp: "asc" },
    take: 50,
  });

  res.json(leads);
});

// POST /leads/:id/mark-letter-sent
router.post("/:id/mark-letter-sent", requireAuth, async (req, res) => {
  const authedReq = req as AuthedRequest;
  const leadId = String(req.params.id);

  const { letterTemplate, method, trackingRef } = req.body as {
    letterTemplate?: unknown;
    method?: unknown;
    trackingRef?: unknown;
  };

  if (!letterTemplate || typeof letterTemplate !== "string") {
    return res.status(400).json({ message: "letterTemplate is required" });
  }

  if (!isLetterMethod(method)) {
    return res
      .status(400)
      .json({ message: "method must be post or hand_delivered" });
  }

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
  });

  if (!lead) {
    return res.status(404).json({ message: "Lead not found" });
  }

  const today = new Date();
  const nextOutreachDate = addDays(today, 14);
  const userId = authedReq.user?.userId ?? null;

  const result = await prisma.$transaction(async (tx) => {
    const letter = await tx.letter.create({
      data: {
        leadId,
        letterTemplate,
        sentDate: today,
        method,
        trackingRef: typeof trackingRef === "string" ? trackingRef : null,
        createdById: userId,
      },
    });

    await tx.activity.create({
      data: {
        leadId,
        type: "letter",
        body: `Letter sent (${method})${
          typeof trackingRef === "string" && trackingRef ? ` - ${trackingRef}` : ""
        }`,
        createdById: userId,
      },
    });

    const updatedLead = await tx.lead.update({
      where: { id: leadId },
      data: {
        outreachStage: 1,
        outreachStartedAt: today,
        nextOutreachDate,
        outreachPaused: false,
        doNotContact: false,
        lastContacted: today,
        leadTemperature: getLeadTemperatureFromStage(1),
        score: addToScore(lead.score, 5),
      },
    });

    return { letter, lead: updatedLead };
  });

  res.status(201).json(result);
});

// POST /leads/:id/pause-outreach
router.post("/:id/pause-outreach", requireAuth, async (req, res) => {
  const leadId = String(req.params.id);

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
  });

  if (!lead) {
    return res.status(404).json({ message: "Lead not found" });
  }

  const updated = await prisma.lead.update({
  where: { id: leadId },
  data: {
    outreachPaused: true,
    status: "paused",
  },
});

  await prisma.activity.create({
    data: {
      leadId,
      type: "note",
      body: "Outreach paused",
    },
  });

  res.json(updated);
});

// POST /leads/:id/resume-outreach
router.post("/:id/resume-outreach", requireAuth, async (req, res) => {
  const leadId = String(req.params.id);

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
  });

  if (!lead) {
    return res.status(404).json({ message: "Lead not found" });
  }

  const updated = await prisma.lead.update({
  where: { id: leadId },
  data: {
    outreachPaused: false,
    status: "active",
  },
});

  await prisma.activity.create({
    data: {
      leadId,
      type: "note",
      body: "Outreach resumed",
    },
  });

  res.json(updated);
});

// POST /leads/:id/do-not-contact
router.post("/:id/do-not-contact", requireAuth, async (req, res) => {
  const leadId = String(req.params.id);

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
  });

  if (!lead) {
    return res.status(404).json({ message: "Lead not found" });
  }

  const updated = await prisma.lead.update({
    where: { id: leadId },
    data: {
      doNotContact: true,
      status: "dnc",
      outreachPaused: true,
    },
  });

  await prisma.activity.create({
    data: {
      leadId,
      type: "note",
      body: "Marked as Do Not Contact",
    },
  });

  res.json(updated);
});

// POST /leads/:id/recontact-email
router.post("/:id/recontact-email", requireAuth, async (req, res) => {
  const leadId = String(req.params.id);

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
  });

  if (!lead) {
    return res.status(404).json({ message: "Lead not found" });
  }

  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + 14);

  const updated = await prisma.lead.update({
    where: { id: leadId },
    data: {
      outreachStage: 2,
      nextOutreachDate: nextDate,
      leadTemperature: getLeadTemperatureFromStage(2),
      score: addToScore(lead.score, 5),
    },
  });

  await prisma.activity.create({
    data: {
      leadId,
      type: "email",
      body: "Recontact email sent",
    },
  });

  res.json(updated);
});

// POST /leads/:id/log-call
router.post("/:id/log-call", requireAuth, async (req, res) => {
  const leadId = String(req.params.id);

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
  });

  if (!lead) {
    return res.status(404).json({ message: "Lead not found" });
  }

  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + 14);

  const updated = await prisma.lead.update({
    where: { id: leadId },
    data: {
      outreachStage: 3,
      nextOutreachDate: nextDate,
      leadTemperature: getLeadTemperatureFromStage(3),
      score: addToScore(lead.score, 10),
    },
  });

  await prisma.activity.create({
    data: {
      leadId,
      type: "call",
      body: "Call attempt logged",
    },
  });

  res.json(updated);
});

// GET /leads/:id
router.get("/:id", requireAuth, async (req, res) => {
  const lead = await prisma.lead.findUnique({
    where: { id: String(req.params.id) },
    include: {
  activities: true,
  deals: true
}
  });

  if (!lead) {
    return res.status(404).json({ message: "Lead not found" });
  }

  res.json(lead);
});

// PUT /leads/:id
router.put("/:id", requireAuth, async (req, res) => {
  const {
    businessName,
    city,
    email,
    phone,
    website,
    postcode,
    notes,
    leadTemperature,
    score,
    lastContacted,
    nextFollowUp,
    status,
  } = req.body as {
    businessName?: unknown;
    city?: unknown;
    email?: unknown;
    phone?: unknown;
    website?: unknown;
    postcode?: unknown;
    notes?: unknown;
    leadTemperature?: unknown;
    score?: unknown;
    lastContacted?: unknown;
    nextFollowUp?: unknown;
    status?: unknown;
  };

  const data: Prisma.LeadUpdateInput = {};

  if (typeof businessName === "string" && businessName.trim()) {
    data.businessName = businessName;
    data.businessNameNormalized = normalizeName(businessName);
  }

  if (typeof city === "string") data.city = city;
  if (typeof email === "string") data.email = email;
  if (typeof phone === "string") data.phone = phone;
  if (typeof website === "string") {
  data.website = website;
  data.websiteDomain = website.trim()
    ? normalizeWebsiteDomain(website)
    : null;
}
  if (typeof postcode === "string") data.postcode = postcode;
  if (typeof notes === "string") data.notes = notes;
  if (isLeadTemperature(leadTemperature)) data.leadTemperature = leadTemperature;
  if (isLeadStatus(status)) data.status = status;
  if (typeof score === "number") data.score = score;
  if (typeof lastContacted === "string" && lastContacted) {
    data.lastContacted = new Date(lastContacted);
  }
  if (typeof nextFollowUp === "string" && nextFollowUp) {
    data.nextFollowUp = new Date(nextFollowUp);
  }

  const updated = await prisma.lead.update({
    where: { id: String(req.params.id) },
    data,
  });

  res.json(updated);
});

// POST /leads/:id/activities
router.post("/:id/activities", requireAuth, async (req, res) => {
  const leadId = String(req.params.id);

  const { type, body, followUpDate } = req.body as {
    type?: unknown;
    body?: unknown;
    followUpDate?: unknown;
  };

  if (!isActivityType(type)) {
    return res.status(400).json({ message: "valid type is required" });
  }

  if (!body || typeof body !== "string") {
    return res.status(400).json({ message: "body is required" });
  }

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) {
    return res.status(404).json({ message: "Lead not found" });
  }

  const created = await prisma.activity.create({
    data: {
      leadId,
      type,
      body,
      followUpDate:
        typeof followUpDate === "string" && followUpDate
          ? new Date(followUpDate)
          : null,
    },
  });

  if (type === "follow_up" && typeof followUpDate === "string" && followUpDate) {
    await prisma.lead.update({
      where: { id: leadId },
      data: { nextFollowUp: new Date(followUpDate) },
    });
  }

  res.status(201).json(created);
});

// POST /leads/:id/complete-followup
router.post("/:id/complete-followup", requireAuth, async (req, res) => {
  const leadId = String(req.params.id);

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
  });

  if (!lead) {
    return res.status(404).json({ message: "Lead not found" });
  }

  await prisma.activity.create({
    data: {
      leadId,
      type: "follow_up",
      body: "Follow-up completed",
    },
  });

const updated = await prisma.lead.update({
  where: { id: leadId },
  data: {
    nextFollowUp: null,
    score: addToScore(lead.score, 10),
  },
});

  res.json(updated);
});

// DELETE /leads/:id
router.delete("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  await prisma.lead.delete({
    where: { id: String(req.params.id) }
  });

  res.json({ ok: true });
});

export default router;