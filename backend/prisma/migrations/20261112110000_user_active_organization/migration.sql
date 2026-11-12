-- Explicit active organization context. Legacy User.organizationId remains for compatibility.
CREATE TABLE "UserActiveOrganization" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserActiveOrganization_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "UserActiveOrganization_userId_key" ON "UserActiveOrganization"("userId");
CREATE INDEX "UserActiveOrganization_organizationId_idx" ON "UserActiveOrganization"("organizationId");
ALTER TABLE "UserActiveOrganization" ADD CONSTRAINT "UserActiveOrganization_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserActiveOrganization" ADD CONSTRAINT "UserActiveOrganization_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill one deterministic active organization for legacy users.
INSERT INTO "UserActiveOrganization" ("id","userId","organizationId","updatedAt")
SELECT 'activeorg_' || u."id", u."id", u."organizationId", CURRENT_TIMESTAMP
FROM "User" u
JOIN "OrganizationMembership" m
  ON m."userId" = u."id"
 AND m."organizationId" = u."organizationId"
 AND m."status" = 'ACTIVE'
WHERE u."organizationId" IS NOT NULL
ON CONFLICT ("userId") DO NOTHING;
