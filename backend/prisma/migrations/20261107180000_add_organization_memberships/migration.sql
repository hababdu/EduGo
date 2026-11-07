-- Create organization-scoped memberships while keeping legacy User.organizationId/User.role intact.
-- No existing user or school records are imported. New memberships are created through onboarding/admin flows.
-- Global platform roles are intentionally outside OrganizationMembership.

CREATE TYPE "OrganizationRole" AS ENUM ('STUDENT', 'TEACHER', 'ADMIN');
CREATE TYPE "MembershipStatus" AS ENUM (
  'REQUESTED',
  'INVITED',
  'ACTIVE',
  'SUSPENDED',
  'LEFT',
  'REJECTED'
);

CREATE TABLE "OrganizationMembership" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "role" "OrganizationRole" NOT NULL,
  "status" "MembershipStatus" NOT NULL DEFAULT 'REQUESTED',
  "invitedById" TEXT,
  "approvedById" TEXT,
  "joinedAt" TIMESTAMP(3),
  "leftAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrganizationMembership_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrganizationMembership_userId_organizationId_role_key"
  ON "OrganizationMembership"("userId", "organizationId", "role");
CREATE INDEX "OrganizationMembership_organizationId_status_role_idx"
  ON "OrganizationMembership"("organizationId", "status", "role");
CREATE INDEX "OrganizationMembership_userId_status_idx"
  ON "OrganizationMembership"("userId", "status");
CREATE INDEX "OrganizationMembership_invitedById_idx"
  ON "OrganizationMembership"("invitedById");
CREATE INDEX "OrganizationMembership_approvedById_idx"
  ON "OrganizationMembership"("approvedById");

ALTER TABLE "OrganizationMembership"
  ADD CONSTRAINT "OrganizationMembership_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationMembership"
  ADD CONSTRAINT "OrganizationMembership_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
