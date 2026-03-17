import { Router, type Request } from "express";
import multer from "multer";
import { parse } from "csv-parse/sync";
import * as XLSX from "xlsx";
import { requireAuth, requireRole } from "../middleware/auth";
import { prisma } from "../lib/prisma";

type ImportRow = {
  businessName?: string;
  city?: string;
  email?: string;
  phone?: string;
  website?: string;
  postcode?: string;
  notes?: string;
};

type ImportPreviewRow = {
  businessName: string | null;
  city: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  postcode: string | null;
  status: "ready" | "skipped";
  reason: string | null;
  notes: string | null;
};

type ConfirmImportRow = {
  businessName?: string | null;
  city?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  postcode?: string | null;
  status?: "ready" | "skipped";
  reason?: string | null;
  notes?: string | null;
};

function normalizeName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9 ]/g, "");
}

function normalizeWebsiteDomain(website: string) {
  try {
    const withProtocol =
      website.startsWith("http://") || website.startsWith("https://")
        ? website
        : `https://${website}`;

    const hostname = new URL(withProtocol).hostname.toLowerCase();

    return hostname.replace(/^www\./, "");
  } catch {
    return website.trim().toLowerCase().replace(/^www\./, "");
  }
}

function normalizePostcode(postcode: string) {
  return postcode.trim().toLowerCase().replace(/\s+/g, "");
}

function detectWebsitePlatformFromUrl(website?: string | null): string | null {
  if (!website || !website.trim()) return null;

  const value = website.trim().toLowerCase();

  if (
    value.includes("shopify.com") ||
    value.includes("cdn.shopify.com") ||
    value.includes("myshopify.com")
  ) {
    return "Shopify";
  }

  if (
    value.includes("wixsite.com") ||
    value.includes("wix.com") ||
    value.includes("wixstatic.com")
  ) {
    return "Wix";
  }

  if (
    value.includes("squarespace.com") ||
    value.includes("static.squarespace.com")
  ) {
    return "Squarespace";
  }

  if (
    value.includes("wordpress.com") ||
    value.includes("/wp-content/") ||
    value.includes("/wp-admin/")
  ) {
    return "WordPress";
  }

  if (value.includes("magento")) {
    return "Magento";
  }

  return "Unknown";
}

async function detectWebsitePlatform(website?: string | null): Promise<string | null> {
  if (!website || !website.trim()) return null;

  const fallback = detectWebsitePlatformFromUrl(website);

  try {
    const url =
      website.startsWith("http://") || website.startsWith("https://")
        ? website
        : `https://${website}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 CRM Platform Detector",
      },
    });

    clearTimeout(timeout);

    const html = (await response.text()).toLowerCase();

    if (
      html.includes("wp-content") ||
      html.includes("wp-includes") ||
      html.includes("wordpress")
    ) {
      return "WordPress";
    }

    if (
      html.includes("cdn.shopify.com") ||
      html.includes("shopify.theme") ||
      html.includes("myshopify.com")
    ) {
      return "Shopify";
    }

    if (
      html.includes("wixstatic.com") ||
      html.includes("wix.com") ||
      html.includes("wix-image") ||
      html.includes("wix-dropdown")
    ) {
      return "Wix";
    }

    if (
      html.includes("static.squarespace.com") ||
      html.includes("squarespace-cdn.com") ||
      html.includes("squarespace")
    ) {
      return "Squarespace";
    }

    if (
      html.includes("mage/cookies") ||
      html.includes("magento") ||
      html.includes("data-mage-init")
    ) {
      return "Magento";
    }

    return fallback;
  } catch {
    return fallback;
  }
}

async function scanWebsiteHealth(website?: string | null): Promise<string | null> {
  if (!website) return null;

  try {
    const url =
      website.startsWith("http://") || website.startsWith("https://")
        ? website
        : `https://${website}`;

    const start = Date.now();

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 CRM Health Scanner",
      },
    });

    const loadTime = Date.now() - start;

    const html = (await response.text()).toLowerCase();

    const issues: string[] = [];

    if (!url.startsWith("https://")) {
      issues.push("No SSL");
    }

    if (!html.includes("meta name=\"description\"")) {
      issues.push("Missing meta description");
    }

    if (!html.includes("meta name=\"viewport\"")) {
      issues.push("No mobile viewport");
    }

    if (loadTime > 3000) {
      issues.push("Slow site");
    }

    if (html.includes("wp-content") && html.includes("generator")) {
      issues.push("WordPress version exposed");
    }

    if (issues.length === 0) {
      return "Healthy";
    }

    return issues.join(", ");
  } catch {
    return "Scan failed";
  }
}

function detectOpportunity(platform?: string | null): string | null {
  if (!platform) return null;

  const p = platform.toLowerCase();

  if (p === "wordpress") {
    return "SEO / maintenance opportunity";
  }

  if (p === "shopify") {
    return "Ecommerce optimisation opportunity";
  }

  if (p === "wix" || p === "squarespace") {
    return "Website redesign opportunity";
  }

  if (p === "magento") {
    return "High value ecommerce optimisation";
  }

  if (p === "unknown") {
    return "Website audit opportunity";
  }

  return null;
}

function calculateLeadScore(row: {
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  postcode?: string | null;
}) {
  let score = 0;

  if (row.website && row.website.trim()) score += 10;
  if (row.email && row.email.trim()) score += 10;
  if (row.phone && row.phone.trim()) score += 5;

  if (row.postcode && row.postcode.trim().toUpperCase().startsWith("SA")) {
    score += 10;
  }

  const email = row.email?.trim().toLowerCase() || "";
  if (
    email.endsWith("@gmail.com") ||
    email.endsWith("@hotmail.com") ||
    email.endsWith("@outlook.com") ||
    email.endsWith("@yahoo.com")
  ) {
    score -= 5;
  }

  return Math.max(score, 0);
}

function getLeadTemperatureFromScore(score: number): "cold" | "warm" | "hot" {
  if (score >= 20) return "hot";
  if (score >= 10) return "warm";
  return "cold";
}

async function findExistingLead(row: {
  businessName: string;
  website?: string | null;
  postcode?: string | null;
  city?: string | null;
  phone?: string | null;
}) {
  const normalizedBusinessName = normalizeName(row.businessName);
  const normalizedWebsiteDomain =
    row.website && row.website.trim()
      ? normalizeWebsiteDomain(row.website)
      : null;
  const normalizedPostcode =
    row.postcode && row.postcode.trim()
      ? normalizePostcode(row.postcode)
      : null;

  return prisma.lead.findFirst({
    where: {
      OR: [
        normalizedWebsiteDomain
          ? { websiteDomain: normalizedWebsiteDomain }
          : undefined,

        normalizedPostcode
          ? {
              AND: [
                { businessNameNormalized: normalizedBusinessName },
                { postcode: { equals: normalizedPostcode, mode: "insensitive" } },
              ],
            }
          : undefined,

        row.city && row.city.trim()
          ? {
              AND: [
                { businessNameNormalized: normalizedBusinessName },
                { city: { equals: row.city.trim(), mode: "insensitive" } },
              ],
            }
          : undefined,

        row.phone && row.phone.trim()
          ? {
              AND: [
                { businessNameNormalized: normalizedBusinessName },
                { phone: { equals: row.phone.trim(), mode: "insensitive" } },
              ],
            }
          : undefined,

        { businessNameNormalized: normalizedBusinessName },
      ].filter(Boolean) as any,
    },
  });
}

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /import/test
router.post(
  "/test",
  requireAuth,
  requireRole("admin"),
  upload.single("file"),
  async (req: Request, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const fileName = req.file.originalname.toLowerCase();

    if (!fileName.endsWith(".csv") && !fileName.endsWith(".xlsx")) {
  return res
    .status(400)
    .json({ message: "Only CSV and XLSX files are supported" });
}

    let rows: ImportRow[] = [];

if (fileName.endsWith(".csv")) {
  const fileText = req.file.buffer.toString("utf-8");

  rows = parse(fileText, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
    relax_column_count: true,
  }) as ImportRow[];
} else if (fileName.endsWith(".xlsx")) {
  const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];

  rows = XLSX.utils.sheet_to_json(sheet, {
    defval: "",
  }) as ImportRow[];
}

    console.log("CSV rows:", rows);

        const seenWebsiteDomains = new Set<string>();
const seenNamePostcodes = new Set<string>();
const seenNameCities = new Set<string>();
const seenNamePhones = new Set<string>();
        const previewRows: ImportPreviewRow[] = [];

    for (const row of rows) {
      const businessName =
  row.businessName?.trim() ||
  (row as any)["Business Name"]?.trim() ||
  (row as any)["business name"]?.trim() ||
  null;

const city =
  row.city?.trim() ||
  (row as any)["City"]?.trim() ||
  (row as any)["city"]?.trim() ||
  null;


const email =
  row.email?.trim() ||
  (row as any)["Email"]?.trim() ||
  (row as any)["Email Address"]?.trim() ||
  (row as any)["email address"]?.trim() ||
  (row as any)["Email address"]?.trim() ||
  null;

const phone =
  row.phone?.trim() ||
  (row as any)["Phone"]?.trim() ||
  (row as any)["Phone Number"]?.trim() ||
  (row as any)["phone number"]?.trim() ||
  null;

const website =
  row.website?.trim() ||
  (row as any)["Website"]?.trim() ||
  (row as any)["website"]?.trim() ||
  null;

const postcode =
  row.postcode?.trim() ||
  (row as any)["Postcode"]?.trim() ||
  (row as any)["postcode"]?.trim() ||
  null;

  const notes =
  row.notes?.trim() ||
  (row as any)["Notes"]?.trim() ||
  (row as any)["Website Issue"]?.trim() ||
  (row as any)["website issue"]?.trim() ||
  null;

      const normalizedBusinessName = businessName
  ? normalizeName(businessName)
  : null;

const normalizedWebsiteDomain =
  website && website.trim()
    ? normalizeWebsiteDomain(website)
    : null;

const normalizedPostcode =
  postcode && postcode.trim()
    ? normalizePostcode(postcode)
    : null;

const normalizedCity =
  city && city.trim()
    ? city.trim().toLowerCase()
    : null;

const normalizedPhone =
  phone && phone.trim()
    ? phone.trim().toLowerCase()
    : null;

    const namePostcodeKey =
  normalizedBusinessName && normalizedPostcode
    ? `${normalizedBusinessName}|${normalizedPostcode}`
    : null;

const nameCityKey =
  normalizedBusinessName && normalizedCity
    ? `${normalizedBusinessName}|${normalizedCity}`
    : null;

const namePhoneKey =
  normalizedBusinessName && normalizedPhone
    ? `${normalizedBusinessName}|${normalizedPhone}`
    : null;

      if (!businessName) {
        previewRows.push({
          businessName: null,
          city,
          email,
          phone,
          website,
          postcode,
          status: "skipped",
          reason: "Missing business name",
          notes,
        });
        continue;
      }

      let duplicateReason: string | null = null;

if (normalizedWebsiteDomain && seenWebsiteDomains.has(normalizedWebsiteDomain)) {
  duplicateReason = "Duplicate website in file";
}

else if (namePostcodeKey && seenNamePostcodes.has(namePostcodeKey)) {
  duplicateReason = "Duplicate business + postcode in file";
}

else if (nameCityKey && seenNameCities.has(nameCityKey)) {
  duplicateReason = "Duplicate business + city in file";
}

else if (namePhoneKey && seenNamePhones.has(namePhoneKey)) {
  duplicateReason = "Duplicate business + phone in file";
}

if (duplicateReason) {
  previewRows.push({
    businessName,
    city,
    email,
    phone,
    website,
    postcode,
    status: "skipped",
    reason: duplicateReason,
    notes,
  });

  continue;
}

      const existingLead = await findExistingLead({
  businessName,
  website,
  postcode,
  city,
  phone,
});

if (existingLead) {
  previewRows.push({
    businessName,
    city,
    email,
    phone,
    website,
    postcode,
    status: "skipped",
    reason: "Lead already exists in database",
    notes,
  });
  continue;
}

if (normalizedWebsiteDomain) {
  seenWebsiteDomains.add(normalizedWebsiteDomain);
}
if (namePostcodeKey) {
  seenNamePostcodes.add(namePostcodeKey);
}
if (nameCityKey) {
  seenNameCities.add(nameCityKey);
}
if (namePhoneKey) {
  seenNamePhones.add(namePhoneKey);
}

previewRows.push({
  businessName,
  city,
  email,
  phone,
  website,
  postcode,
  status: "ready",
  reason: null,
  notes,
});
    }

    const readyCount = previewRows.filter((row) => row.status === "ready").length;
    const skippedCount = previewRows.filter((row) => row.status === "skipped").length;

    res.json({
      message: "Import preview ready",
      totalRows: previewRows.length,
      readyCount,
      skippedCount,
      rows: previewRows,
    });
  }
);

router.post("/confirm", requireAuth, requireRole("admin"), async (req, res) => {
  const body = req.body as { rows?: ConfirmImportRow[] };

  if (!body.rows || !Array.isArray(body.rows)) {
    return res.status(400).json({ message: "rows array is required" });
  }

  let imported = 0;
  let skipped = 0;

  for (const row of body.rows) {
    if (row.status !== "ready") {
  skipped++;
  continue;
}

    const businessName = row.businessName?.trim();
    if (!businessName) {
  skipped++;
  continue;
}

    const normalizedBusinessName = normalizeName(businessName);

const existingLead = await findExistingLead({
  businessName,
  website: row.website || null,
  postcode: row.postcode || null,
  city: row.city || null,
  phone: row.phone || null,
});

if (existingLead) {
  skipped++;
  continue;
}

    const websiteDomain =
  row.website && row.website.trim()
    ? normalizeWebsiteDomain(row.website)
    : null;

    const score = 0;
const leadTemperature = "cold";
const websitePlatform = await detectWebsitePlatform(row.website || null);
const websiteHealth = await scanWebsiteHealth(row.website || null);
const opportunity = detectOpportunity(websitePlatform);

await prisma.lead.create({
  data: {
    businessName,
    businessNameNormalized: normalizedBusinessName,
    city: row.city || null,
    email: row.email || null,
    phone: row.phone || null,
    website: row.website || null,
    websiteDomain,
    postcode: row.postcode || null,
    notes: row.notes || null,
    score,
    leadTemperature,
    websitePlatform,
    opportunity,
    websiteHealth,
  },
});

    imported++;
  }

  res.json({
  message: "Import confirmed",
  imported,
  skipped,
  total: imported + skipped,
});
});

export default router;