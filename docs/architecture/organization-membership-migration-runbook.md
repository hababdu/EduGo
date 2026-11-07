# Organization membership migration runbook

This is an additive schema migration. It creates the organization-scoped membership table and enums. It intentionally does not import, rewrite, or delete existing user, school, group, parent, payment, or learning records. The new application flow should create memberships explicitly as users join schools or administrators are appointed.

## Before deployment

1. Confirm this is the intended database/environment.
2. Take a database backup even if historical records are not required; backups are a rollback safety measure, not a commitment to reuse old records.
3. Review the migration SQL and coordinate deployment with the application release.
4. Confirm the previous Prisma migrations are already applied.

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

For a disposable local development database, `npx prisma migrate dev` may be used instead of `migrate deploy`. Do not run `migrate dev` against production.

## Verify schema

```sql
SELECT to_regclass('"OrganizationMembership"') AS membership_table;

SELECT COUNT(*) AS membership_rows
FROM "OrganizationMembership";
```

A newly installed membership table is expected to be empty. Membership records are created by the new onboarding and school-administration flows. Existing `User.organizationId` and `User.role` are not authoritative for the new authorization model.

## Rollout requirements

- Do not enable membership-based authorization until the application has implemented and tested membership creation, school selection, invitation/approval, and active-organization context.
- Keep legacy columns temporarily to avoid breaking unconverted modules. They are compatibility fields only and must not grant access in new endpoints.
- `SUPER_ADMIN` remains a global platform role, not an organization membership.
- Guardian access must be represented by an explicit verified guardian-child link, not by assigning a global `PARENT` role.
- A school administrator must be appointed by a Super Admin and bound to exactly the target school in the membership record. Teachers must be appointed by an active administrator of that same school.
- All service operations that create or change memberships must validate actor permissions and write audit metadata in a transaction.

## Rollback

Do not drop `OrganizationMembership` as an automatic rollback. Stop new membership writes, preserve an audit export, and prepare a reviewed reverse migration if rollback is necessary. Never run destructive data cleanup automatically as part of application rollback.
