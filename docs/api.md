# API Overview

Base: `/api/v1`. Authentication via HttpOnly cookie (`access_token`,
`refresh_token`). Requires `Content-Type: application/json` for bodies.
All protected endpoints require authentication; roles in parentheses.

Common success: `{ "success": true, "message": "...", "data": ... }`.
Common error: `{ "success": false, "message": "...", "errors": {} }`.

## Authentication (/auth)

- POST /auth/login — email/password; sets cookies; audit + rate-limited.
  Errors: 400 missing, 401 bad credentials, 429 too many.
- POST /auth/logout — revokes refresh session; clears cookies.
- POST /auth/refresh — rotates refresh session, new access token.
- GET /auth/me — current user (id, name, email, role, status).
- GET /auth/test/:role — dev only, RBAC probe endpoints.

## Datasets (/datasets)

- GET /datasets, GET /datasets/:id, POST /datasets, PATCH /datasets/:id,
  PATCH /datasets/:id/status — ADMIN.
- Create: `{ code, name, description }`. Codes normalized uppercased.
  Duplicate code -> 409. Status values: ACTIVE/INACTIVE.

## Indicators (/indicators)

- GET /indicators, GET /indicators/:id, POST, PATCH /:id, PATCH /:id/status — ADMIN.
- `{ dataset_id, code, name, data_type, required, min_value, max_value, precision }`.
  `data_type` ∈ `numeric | decimal | text | date | yes/no | percentage`.
  Duplicate (dataset_id, code) -> 409.

## Reporting Periods (/reporting-periods)

- GET, GET /:id, POST, PATCH /:id, PATCH /:id/status — ADMIN.
- `{ label, period_type, start_date, end_date }`; period_type ∈
  `MONTHLY | QUARTERLY | YEARLY | CUSTOM`; statuses OPEN/CLOSED;
  end >= start else 422; closed periods cannot be reopened (409).

## Submissions (/submissions)

- GET /submissions/my, GET /submissions/:id, POST /submissions,
  PATCH /submissions/:id, POST /submissions/:id/submit — DATA_ENTRY only.
- Ownership enforced (404 for others' submissions). One active
  submission per dataset+period (409/422). Closed periods block new
  submission and freeze drafts. Status transitions validated:
  DRAFT -> SUBMITTED -> UNDER_REVIEW -> APPROVED or RETURNED;
  RETURNED -> SUBMITTED (same record).

## Review (/review) (REPORTING)

- GET /review/queue, GET /review/submissions/:id,
  POST /review/submissions/:id/start, POST /review/submissions/:id/approve,
  POST /review/submissions/:id/return (`{ reason }` mandatory).

## Notifications (/notifications)

- GET /notifications, GET /notifications/unread-count,
  PATCH /notifications/:id/read, PATCH //notifications/read-all — any
  authenticated role, scoped to the owner (cross-user -> 404).

## Reports (/reports) (REPORTING, and Manager/Admin by role config)

- GET /reports/dataset?dataset_id&reporting_period_id
- GET /reports/monthly?reporting_period_id
- GET /reports/indicator?...
- GET /reports/submission-status?...
- GET /reports/history?...
- POST /reports/custom/preview `{ dataset_id, indicator_ids[], reporting_period_ids[] }`
- POST /reports/custom/export/pdf and /export/excel (same body)

## Analytics (/analytics) (MANAGER / REPORTING / ADMIN)

- GET /analytics/dashboard
- GET /analytics/indicator-trend?dataset_id&indicator_id&start_period_id&end_period_id
- GET /analytics/indicator-comparison?dataset_id&indicator_id&period_a&period_b

## Admin Users (/admin/users) (ADMIN)

- GET /admin/users?search&role&status&page&pageSize (pageSize max 100)
- GET /admin/users/:id, POST /admin/users `{ name, email, role, password }`
- PATCH /admin/users/:id `{ name?, email?, role?, status? }`
- POST /admin/users/:id/password `{ password }` -> revokes sessions + audit
- POST /admin/users/:id/activate and /deactivate; last active ADMIN protected (409).

## Admin Audit Logs (/admin/audit-logs) (ADMIN)

- GET /admin/audit-logs?action&user_id&resource_type&date_from&date_to&search&page&pageSize

## Admin System (/admin/system)

- GET /admin/system/overview — safe metadata, DB status, counts, users by role, recent activity. Never exposes secrets.

## Health

- GET /health → `{ success: true, message, data: { status: "ok", database: "ok" } }`
