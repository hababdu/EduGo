# Trial lessons

## Purpose

A trial lesson lets a prospective student experience a school before deciding whether to enroll. It is not an enrollment, group membership, attendance record, paid lesson, or payment obligation.

## Lifecycle

`REQUESTED -> APPROVED -> ATTENDED | NO_SHOW`

A school administrator may move a request from `REQUESTED` to `APPROVED` or `REJECTED`. The student may cancel a `REQUESTED` or `APPROVED` request. After approval, the assigned group teacher or an active school administrator records attendance.

## Rules

- One trial request per user per school. The unique database constraint includes cancelled and rejected requests, so users cannot repeatedly claim trials at the same school.
- Only active users can request a trial.
- The school must be active and publicly listed.
- The selected group must belong to that school and must not be deleted.
- A current active student membership in the same school makes a trial unnecessary and blocks trial booking.
- The requested time must be in the future.
- Only an active administrator of that school may approve or reject a request.
- Attendance may be recorded only by that school's active administrator or the teacher assigned to the selected group who also has an active TEACHER membership in that school.
- Trial operations do not create `GroupMember`, regular `AttendanceRecord`, tuition `Payment`, XP, or course entitlements.

## API

- `GET /trials/me`: current user's trial requests.
- `POST /trials/schools/:organizationId`: request a trial; body contains `groupId`, `scheduledAt`, and optional `note`.
- `PATCH /trials/:trialId/review`: school admin decision (`APPROVED` or `REJECTED`).
- `PATCH /trials/:trialId/attendance`: assigned teacher or school admin records `attended: true|false`.
- `PATCH /trials/:trialId/cancel`: student cancels their own pending or approved request.

## Capacity note

The service checks current group members plus pending/approved trial requests against the group's configured capacity. If strict concurrency-safe capacity enforcement is required under high booking load, the booking transaction must lock the group row (or use a serializable transaction with retry) before counting and inserting. The unique per-user/per-school constraint already prevents duplicate trial claims by the same user.

## Deployment

Apply the additive migration `20261107200000_add_trial_lessons` after the membership and public-school profile migrations. Validate Prisma schema and generated client, build the backend, and run unit tests before deploying. Do not enable trial booking in a production client until the migration has been applied.
