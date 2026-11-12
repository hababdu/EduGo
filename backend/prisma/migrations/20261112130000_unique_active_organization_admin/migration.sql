-- A user may hold an active ADMIN membership in only one organization.
-- Fail explicitly instead of silently deleting or demoting existing memberships.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "OrganizationMembership"
    WHERE "role" = 'ADMIN' AND "status" = 'ACTIVE'
    GROUP BY "userId"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot add unique active organization admin constraint: duplicate active ADMIN memberships exist. Resolve them before retrying.';
  END IF;
END $$;

CREATE UNIQUE INDEX "OrganizationMembership_one_active_admin_per_user"
ON "OrganizationMembership" ("userId")
WHERE "role" = 'ADMIN' AND "status" = 'ACTIVE';
