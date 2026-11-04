# Android feature parity checklist

This document tracks the native Kotlin app against the EduGo Telegram Mini App and backend APIs.

## Implemented in the native app
- Student dashboard, daily schedule, learning materials, assigned tests, test sessions, ranking, groups, notifications and AI assistant.
- Student group details use the student-safe group endpoint (the backend intentionally hides member identities from students).
- Student homework supports text and up to five uploaded files, with the backend's ownership and submission validation.
- Student material attachments can be sent to the linked Telegram chat using the existing authenticated endpoint.
- Teacher dashboard, group roster, attendance, material creation/editing/deletion, draft/publish controls and file uploads.
- Teacher test creation with group assignment and publishing.
- Teacher homework submission review, scoring, feedback and return-for-correction.
- Admin student list and dashboard; Super Admin overview and organization details.
- API 31 minimum SDK, authenticated API client with refresh-token handling, theme preference, notifications and role-based navigation.

## Remaining parity work before visual redesign
- Admin: full group management, payments, admissions/lead CRM, user/role administration, reports and audit views.
- Super Admin: full organization lifecycle, billing, platform settings, backups and audit management.
- Teacher: question bank, test editing/assignment controls, schedule editing, complete student analytics and report export.
- Student/Parent: full lesson log, payment history, file preview/download, account editing and parent linking.
- Cross-platform: offline cache/sync, robust notification routing, accessibility and device-size testing.
- Validate all endpoints against live role-scoped accounts and run Android instrumentation/manual QA.

Do not remove or replace backend business rules to make a screen appear functional. Any unsupported operation must remain visibly unavailable until its API contract is implemented.
