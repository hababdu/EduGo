# Organization membership migration runbook

This migration is additive. It creates `OrganizationMembership` and copies legacy school-scoped roles into it. It deliberately does not remove or rewrite `User.organizationId`, `User.role`, `ParentLink`, or `ParentInvite`.

## Before deployment

1. Take and verify a PostgreSQL backup.
2. Deploy during a maintenance window or ensure writes to legacy organization/role fields are paused while the migration runs.
3. Confirm the target database is the intended environment and that the previous Prisma migrations are already applied.
4. Review the migration SQL before applying it.

## Apply

From `backend/`:

```bash
npx prisma format
npx prisma validate
npx prisma migrate status
npx prisma migrate deploy
npx prisma generate
npm run build
npm test -- --runInBand
```

For a local disposable development database, `npx prisma migrate dev` may be used instead of `migrate deploy`. Do not run `migrate dev` against production.

## Verify the backfill

Run these read-only SQL checks against the same database:

```sql
-- Legacy users eligible for membership backfill
SELECT COUNT(*) AS eligible_legacy_users
FROM "User"
WHERE "organizationId" IS NOT NULL
  AND "role"::text IN ('STUDENT', 'TEACHER', 'ADMIN');

-- Membership rows created by the migration
SELECT COUNT(*) AS active_memberships
FROM "OrganizationMembership"
WHERE "status" = 'ACTIVE';

-- Eligible legacy users still missing their matching role membership (must be 0)
SELECT COUNT(*) AS missing_memberships
FROM "User" u
WHERE u."organizationId" IS NOT NULL
  AND u."role"::text IN ('STUDENT', 'TEACHER', 'ADMIN')
  AND NOT EXISTS (
    SELECT 1
    FROM "OrganizationMembership" m
    WHERE m."userId" = u."id"
      AND m."organizationId" = u."organizationId"
      AND m."role"::text = u."role"::text
  );

-- Global/guardian roles intentionally excluded from this backfill
SELECT "role"::text AS role, COUNT(*) AS users
FROM "User"
WHERE "role"::text IN ('SUPER_ADMIN', 'PARENT')
GROUP BY "role"::text;
```

The membership count may exceed the eligible legacy-user count if a user already has additional membership rows. Investigate any non-zero missing-membership count before enabling membership-based authorization.

## Compatibility and rollout

- Keep legacy fields until all API, bot, web, and mobile authorization paths read organization-scoped memberships.
- Do not infer a guardian relationship from `User.role = PARENT`; review existing `ParentLink` data and migrate guardian access separately.
- Keep `SUPER_ADMIN` global; it is not an `OrganizationRole`.
- Do not switch guards to membership-only authorization until the backfill checks pass and all affected services have been migrated and tested.
- During the transition, any write that changes legacy organization/role assignments must also be reflected in membership data by an explicit service-level transaction. Avoid dual writes scattered across controllers.

## Rollback

Do not drop `OrganizationMembership` as a routine rollback. The migration is additive and legacy fields remain available. If rollback is required, first stop new membership writes, export the membership table for audit, and prepare a reviewed reverse migration. Never delete membership data automatically in a production rollback.
