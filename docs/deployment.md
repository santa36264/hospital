# Deployment & Operations Guide

This document covers production configuration, security settings,
backup strategy, and deployment steps for the Hospital Health Data
Management, Reporting and Analysis System.

## HL: DO NOT COMMIT SECRETS

- Real secrets live ONLY in `server/.env` / `client/.env`, which are
  git-ignored.
- Only `.env.example` files are tracked.
- Never put JWT secrets, database passwords, or real credentials in
  source, README, or docs.

## Environment variables (production)

### server/.env

| Variable | Notes |
|---|---|
| NODE_ENV | `production` |
| PORT | Backend port, e.g. 5000 |
| CLIENT_URL | Allowed frontend origin for CORS (must include credentials: server sets `credentials: true`) |
| DATABASE_HOST / DATABASE_PORT / DATABASE_NAME / DATABASE_USER / DATABASE_PASSWORD | MySQL credentials — do NOT commit values |
| JWT_ACCESS_SECRET | Random 256-bit secret; required, not committed |
| JWT_ACCESS_EXPIRES_IN | `15m` default |
| JWT_REFRESH_SECRET | Separate random secret |
| JWT_REFRESH_EXPIRES_IN | `7d` default |
| SESSION_INACTIVITY_TIMEOUT_MINUTES | `30` default |
| AUTH_RATE_LIMIT_WINDOW_MS / AUTH_RATE_LIMIT_MAX | Login rate limit — production default in `.env.example` is 20 / 15 min |

### client/.env

| Variable | Notes |
|---|---|
| VITE_API_BASE_URL | e.g. `https://api.example.com/api/v1` |

## Security settings expected in production

- Cookies: `HttpOnly`, `Secure` (NODE_ENV=production), `SameSite=Lax`.
- CORS: only `CLIENT_URL`; credentials allowed.
- Security headers on every response (X-Content-Type-Options,
  X-Frame-Options, Referrer-Policy, CORP, Cache-Control: no-store).
- Passwords hashed with bcrypt (min 12 chars enforced by policy).
- Login rate limiting enabled (see `.env.example`).
- Run the App over HTTPS in production (TLS should terminate at a
  reverse proxy / platform assigned certificate).

## Database readiness

- All migrations are in `server/migrations/` and are additive.
- Initialize a production database:
  1. Create the database: `CREATE DATABASE hospital_health_data;`
  2. `cd server && npx knex migrate:latest`
  3. Seed only roles in production: `npx knex seed:run`
     (seed 002 inserts DEV users — do NOT run in production.
     Grant roles by seeding roles only, or insert real admin via SQL.)
- Constraints intact (see Stage 03 review): unique emails, unique
  dataset codes, unique indicator per dataset, one submission per
  dataset+period, foreign keys, status enums.

## Deployment steps (typical)

### Backend

1. `cd server`
2. `npm ci`
3. Copy `.env.example` to `.env`, set production values.
4. `npx knex migrate:latest`
5. Start (example with Node):
   - `NODE_ENV=production npm start`, or under a process manager
     (pm2, systemd, container orchestrator).
6. Health check: `GET /api/v1/health` should return
   `{ "success": true, ..., "database": "ok" }`.

### Frontend

1. `cd client`
2. `npm ci`
3. Set `VITE_API_BASE_URL` in `.env` (or build-time env var).
4. `npm run build` (produces `dist/`).
5. Serve `dist/` via a static host or reverse proxy.

## Backup strategy

Documented strategy (implement in your infrastructure):

- **Database backups**: daily MySQL dump via `mysqldump` (or
  platform-managed snapshots) stored off-box.
- **Frequency**: daily; consider hourly snapshots of `hospital_health_data`.
- **Retention**: keep 30 daily + 12 weekly + 12 monthly backups.
- **Restore procedure**: create a staging database, run
  `mysql hospital_health_data < dump.sql`, run
  `npx knex migrate:latest`, verify row counts and a smoke
  workflow.
- **Verification**: monthly restore drill into a sandbox
  environment; verify `/api/v1/health`, login, submission
  approval, report generation.
- Cold storage of backups should also be encrypted.

## Known non-blocking warnings

- Client bundle may exceed 500 kB after minification due to
  Recharts; accepted for this stage (see Stage 10–13 reviews).
