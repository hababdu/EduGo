# EduGo — Multi-organization identity, school discovery and enrollment

Status: accepted product architecture; implementation plan
Branch: feature/multi-org-auth

## Product decisions

- A person has one global identity, but may belong to multiple schools/organizations.
- A new account is not automatically assigned to a school.
- A user can browse public school profiles, compare verified education indicators and school ratings, and attend at most one free trial lesson per school.
- Browsing and trial participation do not create a paid student enrollment or payment obligation.
- A student chooses a school and requests/starts enrollment according to that school's admission policy.
- A school's Super Admin-appointed ADMIN manages that school and appoints one or more TEACHER members.
- Only a SUPER_ADMIN can appoint or revoke an organization's ADMIN.
- Membership role and status are scoped to an organization; global identity must not carry a single organization-specific role.
- A person can be a student in multiple organizations. Membership, group enrollment, attendance, progress and payment obligations remain separate for each organization.
- Every organization controls its own student fee rules. A student's obligation is calculated only from the relevant organization's active enrollment, group/course, policy and effective dates.
- Parent/guardian relationship is independent of school membership and can cover more than one child and more than one school.

## Core domain model (target)

### User
Global identity and login attributes only: Telegram identity, profile, account status, created/last-active timestamps. Do not use User.organizationId or User.role as the source of truth for school-scoped authorization after migration.

### OrganizationMembership
One row per user and organization. Fields:
- id, userId, organizationId
- role: STUDENT | TEACHER | ADMIN
- status: REQUESTED | INVITED | ACTIVE | SUSPENDED | LEFT | REJECTED
- createdById, approvedById, joinedAt, leftAt, createdAt, updatedAt
- unique(userId, organizationId, role) or equivalent constraints after deciding whether same person can hold multiple roles in one school.
- organization-specific metadata must live here or in a dedicated profile relation.

Authorization always resolves the active organization context and verifies an ACTIVE membership with the required role. Never trust organizationId or role sent by the client.

### Organization public profile
Add a public-facing profile separate from operational secrets:
- slug, logo, cover, description, address/location, contacts, subjects/programs, age/grade range, languages, teaching format, published status.
- Never expose storageChatId, backups, internal notes, billing credentials or admin-only settings in public APIs.

### School quality and ratings
Expose transparent indicators only when supported by verified data:
- verified learner outcomes and completion rates with cohort/time-window definitions;
- attendance and retention indicators;
- teacher qualifications/experience when verified and consented;
- verified student/guardian reviews after a real enrollment/trial.
Do not fabricate a single "education quality" score. If a composite ranking is introduced, publish its formula, sample size, freshness and confidence/coverage. Provide sorting by rating, subject, location and other objective filters.

### TrialLesson
A trial is distinct from paid enrollment:
- userId, organizationId, lesson/group/course reference, scheduledAt, status REQUESTED | CONFIRMED | ATTENDED | NO_SHOW | CANCELLED
- unique(userId, organizationId) for one free trial per school (unless a school policy explicitly allows a repeat).
- Trial attendance must not create GroupMember, paid invoices, score/XP eligibility or normal attendance records.
- Prevent capacity overbooking and duplicate concurrent booking with a transaction/unique constraint.
- Trial access is limited to the trial lesson and explicitly public/sample material.

### Enrollment
A student may have many independent enrollments:
- userId, organizationId, groupId/courseId, status REQUESTED | ACTIVE | PAUSED | COMPLETED | WITHDRAWN
- admission approval according to school policy.
- Membership must be ACTIVE before normal group learning access.
- A user can enroll in multiple groups in one school if that school's policy permits.

### SchoolPaymentPolicy and StudentCharge
Keep the existing Organization-to-Super-Admin subscription (OrgPayment/monthlyPlanFee) separate from student tuition.
- School policy defines fee model, amount, billing interval, due date, grace period, late fee/discount, currency, effective dates and payment methods.
- StudentCharge is generated for a specific enrollment and billing period and records a snapshot of the applicable policy.
- Unique key prevents duplicate charges for the same enrollment and billing period.
- Payments are always scoped to organization + enrollment/charge; no cross-school balance aggregation or payment leakage.
- A school policy change affects future charges unless an explicit, audited agreement says otherwise.

### GuardianLink
Parent/guardian is a global relationship, not a global PARENT role that replaces student/teacher roles:
- guardianUserId, childUserId, relationship, status PENDING_CHILD_CONFIRMATION | PENDING_SCHOOL_REVIEW | ACTIVE | REVOKED
- invitation code is random, hashed at rest, short-lived, one-time and rate-limited.
- recommended flow: student (or school admin for younger learners) creates invitation; guardian authenticates with their own account; child confirms link where appropriate; school admin can verify/approve according to policy.
- one guardian can link multiple children; a child can have multiple authorized guardians.
- guardian data access is read-only and checked per child on every request; consent/revocation is audited.
- Never convert an existing STUDENT account into a PARENT account. A single global account may be both a learner and a guardian.

### School administration
- Super Admin creates/appoints/revokes an ADMIN membership for a school.
- School ADMIN invites/promotes TEACHER membership; teacher cannot self-assign to a school or group.
- ADMIN and TEACHER memberships are unique to the school and must be active.
- Each organization may have multiple teachers and may have a primary admin plus delegated admins if policy permits.
- All administrative changes are audited with actor, organization, target, before/after and timestamp.

## Required migration from current schema

The current schema has a single nullable User.organizationId and global User.role, and Group/Payment records are partly scoped through that single organization. GroupMember is a separate join but does not represent school membership. GroupsService currently blocks a student from joining a group in another organization and adopts an unassigned user by setting User.organizationId. This must be replaced with membership-based authorization.

Migration must be staged and backward-compatible:
1. Add OrganizationMembership and backfill existing User.organizationId + User.role into memberships.
2. Add organization-scoped public profile, admission settings and quality metrics.
3. Introduce school discovery endpoints that return only published public fields.
4. Add TrialLesson booking/attendance with no paid enrollment side effects.
5. Add Enrollment and school-specific payment policy/charge snapshots.
6. Update group, attendance, tests, assignments, submissions, analytics, ranking, AI context, notifications and file access to resolve membership context.
7. Replace global role assumptions in JWT payload/CurrentUser/RoleGuard with membership-aware active organization context; keep SUPER_ADMIN global.
8. Migrate parent links to guardian-consent flow while preserving existing links and audit history.
9. Dual-read/dual-write during migration; only remove legacy User.organizationId/User.role after all clients and data are migrated.

## Auth and API contract

- Authentication proves identity only; it does not automatically grant a school role.
- Login returns identity plus available active memberships; the client chooses an active organization context.
- An explicit organization context is sent on scoped requests (header or route), but backend validates it against the user's active membership.
- Access tokens identify the user/session; avoid embedding a long-lived school role as the only authorization source.
- Switching organization changes context, not the user's identity or other memberships.
- Suspended organization blocks only that organization's membership access; it must not lock a user's other schools.
- Global account BLOCKED/deleted status blocks all memberships.
- Public school discovery and public sample content use narrowly scoped public endpoints; all private data remains authenticated.

## Acceptance criteria

- New user can browse every published school without joining it.
- User can view a school's public profile and verified indicators without seeing private learner data.
- User can book and attend one trial lesson per school; trial does not create tuition, normal group membership or paid learner access.
- User can join multiple schools and hold different scoped roles where policy permits.
- Only Super Admin can appoint school ADMIN; only that school's ADMIN can appoint its TEACHER members.
- A teacher can be assigned to multiple groups and, if invited, multiple schools.
- Student fees, invoices, payment status and late rules are isolated per school and enrollment.
- A school suspension does not affect the user's other active schools.
- Guardian access is explicitly consented, revocable, read-only and child-scoped.
- All access-control boundaries have unit, integration and cross-organization isolation tests.
