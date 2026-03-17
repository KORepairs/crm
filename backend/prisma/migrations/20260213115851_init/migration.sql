-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'sales');

-- CreateEnum
CREATE TYPE "LeadTemperature" AS ENUM ('cold', 'warm', 'hot');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" UUID NOT NULL,
    "business_name" TEXT NOT NULL,
    "business_name_normalized" TEXT NOT NULL,
    "category" TEXT,
    "website" TEXT,
    "website_domain" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "postcode" TEXT,
    "city" TEXT,
    "lead_temperature" "LeadTemperature" NOT NULL DEFAULT 'cold',
    "score" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "last_contacted" TIMESTAMP(3),
    "next_follow_up" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_to" UUID,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_leads_website_domain" ON "leads"("website_domain");

-- CreateIndex
CREATE INDEX "idx_leads_business_name_normalized" ON "leads"("business_name_normalized");

-- CreateIndex
CREATE INDEX "idx_leads_name_postcode" ON "leads"("business_name_normalized", "postcode");

-- CreateIndex
CREATE INDEX "idx_leads_phone" ON "leads"("phone");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
