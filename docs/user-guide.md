# User Operation Guide

Stage 14 final user guide. One hospital, four roles.

## Signing in

- Open the app, enter your email and password.
- A session requires an active account; inactive accounts cannot sign
  in and inactive sessions are signed out.
- Stay signed in for at most 30 minutes of inactivity.

## ADMIN

Dashboard
- System overview (users, active datasets, open periods, recent
  administrative activity).

Users
- Create users; assign ONE primary role (ADMIN, DATA_ENTRY,
  REPORTING, MANAGER) and an initial password (min 12 chars).
- Edit user name, email, role, status. Email uniqueness enforced.
- Reset a user's password: all of that user's sessions are revoked.
- Deactivate a user: login and existing sessions are blocked. Deactivation,
  not deletion, is the lifecycle mechanism.
- The final active ADMIN cannot be deactivated or demoted.

Datasets / Indicators / Reporting Periods
- Manage dataset definitions (unique code, ACTIVE/INACTIVE).
- Indicators configure code, name, data type, required, min/max/precision,
  status. Types: numeric, decimal, text, date, yes/no, percentage
  (percent default range 0–100).
- Reporting periods: create monthly/quarterly/yearly/custom; OPEN by
  default; CLOSED periods cannot accept new data entry and cannot be
  reopened through ordinary operation.

Audit Logs
- Append-only administrative record; filters (action, entity, dates,
  search); audit access itself is recorded; only ADMIN sees these.

System
- Application metadata; safe environment; database connectivity;
  users by role; recent activity. No secrets.

## DATA_ENTRY

Dashboard
- Shortcut list: open submissions, start new, notifications.

My Submissions
- Your submissions with status/dataset/period filters.
- Create NEW submission only when an OPEN period + ACTIVE dataset +
  ACTIVE indicators exist (one submission per dataset+period).

Submission form
- Enter values per active indicator. Types: numeric, decimal, text,
  date, yes/no, percentage. Save Draft preserves values; Submit moves it
  to SUBMITTED and the form becomes read-only.
- A CLOSED period marks the form read-only with a notice.
- RETURNED submissions show the reporting reason and resubmit back to the
  same record (no new submission).

Notifications
- Only your own workflow notifications.

## REPORTING

Review Queue
- Submissions awaiting review with status, dataset, period, dates.
- Open review detail (values, history, actions). Start Review ->
  Approve (SUBMITTED -> UNDER_REVIEW -> APPROVED) or Return with a
  mandatory reason.
- You cannot approve data you entered yourself (separation of duties).

Reports
- Dataset, Monthly, Indicator, Submission Status, Report History
  generated from APPROVED data only.
- Custom Reports: pick dataset + indicators + periods, preview matrix
  (indicator x period), then Print / PDF / Excel.

Analysis
- Analytics Dashboard and Indicator Analysis restricted to APPROVED
  data; missing values stay blank/null (never silently zeroed).

Notifications
- Your own workflow notifications only.

## MANAGER

Dashboard
- Management view computed from APPROVED data only.

Indicator Analysis
- Trend and comparison of indicators across reporting periods.

Notifications
- Your own notifications.

## RBAC

- DATA_ENTRY cannot configure data, review, or view analytics/audit.
- REPORTING cannot configure data, manage users, or view audit.
- MANAGER cannot use the review workflow or edit configuration.
- ADMIN cannot perform ordinary data entry.

## Password & session security

- Passwords must be at least 12 characters; never displayed after save.
- Sessions expire after JWT expiry or 30 minutes of inactivity.
- Login rate-limited (20 attempts / 15 min in production config).
- Security headers: no-store responses, frame protection, CTO nosniff.
