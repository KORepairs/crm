-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('active', 'paused', 'dnc');

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "status" "LeadStatus" NOT NULL DEFAULT 'active';
