-- CreateEnum
CREATE TYPE "WebsiteStatus" AS ENUM ('unknown', 'missing', 'poor', 'outdated', 'broken', 'good');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('created', 'updated', 'skipped_duplicate', 'error');

-- CreateEnum
CREATE TYPE "LetterMethod" AS ENUM ('post', 'hand_delivered');

-- CreateEnum
CREATE TYPE "LetterResponseStatus" AS ENUM ('none', 'replied', 'won', 'lost');

-- CreateEnum
CREATE TYPE "DealStage" AS ENUM ('proposed', 'won', 'lost');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('Website', 'SEO', 'Hosting', 'Audit');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActivityType" ADD VALUE 'text';
ALTER TYPE "ActivityType" ADD VALUE 'letter';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LeadStatus" ADD VALUE 'won';
ALTER TYPE "LeadStatus" ADD VALUE 'lost';
ALTER TYPE "LeadStatus" ADD VALUE 'dead';

-- DropForeignKey
ALTER TABLE "activities" DROP CONSTRAINT "activities_lead_id_fkey";

-- AlterTable
ALTER TABLE "activities" ADD COLUMN     "created_by" UUID,
ADD COLUMN     "outcome" TEXT;

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "do_not_contact" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "next_outreach_date" TIMESTAMP(3),
ADD COLUMN     "outreach_paused" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "outreach_stage" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "outreach_started_at" TIMESTAMP(3),
ADD COLUMN     "reactivation_stage" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "website_status" "WebsiteStatus" NOT NULL DEFAULT 'unknown';

-- CreateTable
CREATE TABLE "lead_sources" (
    "id" UUID NOT NULL,
    "source_name" TEXT NOT NULL,
    "uploaded_by" UUID,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "file_name" TEXT,
    "notes" TEXT,

    CONSTRAINT "lead_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_import_rows" (
    "id" UUID NOT NULL,
    "lead_source_id" UUID NOT NULL,
    "raw_row_json" JSONB NOT NULL,
    "matched_lead_id" UUID,
    "import_status" "ImportStatus" NOT NULL,
    "changes_json" JSONB,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_import_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "letters" (
    "id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "campaign_id" UUID,
    "letter_template" TEXT NOT NULL,
    "sent_date" TIMESTAMP(3) NOT NULL,
    "method" "LetterMethod" NOT NULL,
    "tracking_ref" TEXT,
    "response_status" "LetterResponseStatus" NOT NULL DEFAULT 'none',
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "letters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deals" (
    "id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "service_type" "ServiceType" NOT NULL,
    "deal_value" DECIMAL(10,2) NOT NULL,
    "stage" "DealStage" NOT NULL,
    "close_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "target_category" TEXT,
    "offer_type" TEXT,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_campaigns" (
    "id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,

    CONSTRAINT "lead_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lead_campaigns_lead_id_campaign_id_key" ON "lead_campaigns"("lead_id", "campaign_id");

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_sources" ADD CONSTRAINT "lead_sources_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_import_rows" ADD CONSTRAINT "lead_import_rows_lead_source_id_fkey" FOREIGN KEY ("lead_source_id") REFERENCES "lead_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_import_rows" ADD CONSTRAINT "lead_import_rows_matched_lead_id_fkey" FOREIGN KEY ("matched_lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "letters" ADD CONSTRAINT "letters_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "letters" ADD CONSTRAINT "letters_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "letters" ADD CONSTRAINT "letters_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_campaigns" ADD CONSTRAINT "lead_campaigns_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_campaigns" ADD CONSTRAINT "lead_campaigns_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
