-- Dynamic education model: organization-scoped configuration, modules, policies and periods.
CREATE TABLE "OrganizationEducationModel" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "modelKey" TEXT NOT NULL DEFAULT 'CUSTOM',
  "settings" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrganizationEducationModel_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OrganizationEducationModel_organizationId_key"
  ON "OrganizationEducationModel"("organizationId");
ALTER TABLE "OrganizationEducationModel"
  ADD CONSTRAINT "OrganizationEducationModel_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "OrganizationModuleConfig" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "featureKey" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "settings" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrganizationModuleConfig_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OrganizationModuleConfig_organizationId_featureKey_key"
  ON "OrganizationModuleConfig"("organizationId", "featureKey");
CREATE INDEX "OrganizationModuleConfig_organizationId_enabled_idx"
  ON "OrganizationModuleConfig"("organizationId", "enabled");
ALTER TABLE "OrganizationModuleConfig"
  ADD CONSTRAINT "OrganizationModuleConfig_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "OrganizationAcademicPeriod" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "periodType" TEXT NOT NULL DEFAULT 'CUSTOM',
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT false,
  "settings" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrganizationAcademicPeriod_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "OrganizationAcademicPeriod_organizationId_startsAt_endsAt_idx"
  ON "OrganizationAcademicPeriod"("organizationId", "startsAt", "endsAt");
CREATE INDEX "OrganizationAcademicPeriod_organizationId_isActive_idx"
  ON "OrganizationAcademicPeriod"("organizationId", "isActive");
ALTER TABLE "OrganizationAcademicPeriod"
  ADD CONSTRAINT "OrganizationAcademicPeriod_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "OrganizationPolicy" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "policyKey" TEXT NOT NULL,
  "config" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrganizationPolicy_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OrganizationPolicy_organizationId_policyKey_key"
  ON "OrganizationPolicy"("organizationId", "policyKey");
CREATE INDEX "OrganizationPolicy_organizationId_idx"
  ON "OrganizationPolicy"("organizationId");
ALTER TABLE "OrganizationPolicy"
  ADD CONSTRAINT "OrganizationPolicy_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
