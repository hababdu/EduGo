-- Ko'p tashkilotli (multi-tenant) tuzilma
CREATE TYPE "OrgStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

CREATE TABLE "Organization" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" "OrgStatus" NOT NULL DEFAULT 'ACTIVE',
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Organization_status_idx" ON "Organization"("status");

CREATE TABLE "AppSetting" (
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

ALTER TABLE "User" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Group" ADD COLUMN "organizationId" TEXT;
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");
CREATE INDEX "Group_organizationId_idx" ON "Group"("organizationId");
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Group" ADD CONSTRAINT "Group_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
