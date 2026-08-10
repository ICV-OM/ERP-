# ALTURUD People ERP

A secure enterprise HR ERP foundation tailored for a multi-location logistics company. It includes an operational UI, PostgreSQL schema, authentication, RBAC, audit logging, organization scoping, employee CRUD APIs, leave API, and structured workspaces for the full HR lifecycle.

## Included modules

Dashboard; Employees; Organization; Attendance; Shift Planning; Leave; Field Workforce; Payroll; Recruitment/ATS; Onboarding; Documents & Expiry; Performance; Learning & Compliance; Employee Assets; HR Services; Approval Center; Employee Relations; Offboarding; Analytics & Reports; Administration.

## Security baseline

- Argon2id password hashing.
- Short-lived signed session token plus server-side session record for revocation.
- HttpOnly + SameSite=Strict cookies; `__Host-` cookie in secure production mode.
- CSRF double-submit token and strict Origin validation on mutations.
- RBAC permissions enforced on the server/API, not only in the UI.
- Organization-scoped SQL queries to prevent cross-organization access.
- Parameterized SQL for database access.
- Audit log for sensitive mutations.
- Login throttling and temporary lockout.
- CSP, HSTS in production, frame protection, MIME protection and restrictive browser permissions.
- `Cache-Control: no-store` for authenticated/private responses.
- Soft-delete pattern for employee records.
- Production browser source maps disabled.

> Important: no application can be declared “fully secure” solely from source code. Before production, complete threat modeling, penetration testing, SAST/DAST, dependency scanning, secrets management, database least-privilege, backup/restore testing and an access-control review.

## Local setup

1. Copy `.env.example` to `.env.local` and replace every placeholder. Use a random `SESSION_SECRET` of at least 32 bytes.
2. Start PostgreSQL: `docker compose up -d postgres`
3. Install dependencies: `npm install`
4. Load environment values into your shell, then run: `npm run db:migrate`
5. Set a unique `SEED_ADMIN_PASSWORD` (minimum 16 chars) and run: `npm run db:seed`
6. Start: `npm run dev`
7. Open `http://localhost:3000`

The migration and seed commands load `.env.local` using Node’s `--env-file` support.

## Recommended production topology

`WAF / CDN -> TLS reverse proxy -> Next.js application -> PostgreSQL private network`

Add an enterprise identity provider (Microsoft Entra ID / Okta or equivalent), managed secrets, centralized logs/SIEM, object storage with malware scanning for documents, managed backups, and private network access to the database.

## Structure

- `src/app` — routes, pages and protected API handlers.
- `src/components` — reusable interface components.
- `src/lib` — auth, security, validation, permissions, database and audit services.
- `db/migrations` — versioned database schema.
- `scripts` — migration, seed and baseline security checks.

## Business logic still requiring company policy decisions

Payroll tax/statutory rules per country, leave entitlement rules, approval matrices, overtime/incentive formulas, exact performance KPI formulas, document retention periods, employee relations procedures, SSO provider, and integrations with finance/fleet/attendance systems must be configured against the company's approved policies and applicable law before go-live.

## Arabic / English interface
The interface is bilingual. Arabic is the default language and uses full RTL layout. Users can switch to English from the login screen or the top bar. The preference is stored in the non-sensitive `alturud_locale` browser cookie and does not alter authentication or authorization state.

## Excel bulk employee import
Authorized HR users can open **Employees → Import Excel**, download the approved template, and upload up to 1,000 rows per operation. The server accepts `.xlsx` only, limits uploads to 5 MB, rejects formulas, validates every row, resolves department/branch codes inside the active organization, rejects duplicates, inserts atomically, and writes an audit event.

## Supabase
See `SUPABASE.md` for production database configuration. Never commit Supabase credentials or `.env.local` to GitHub.

## GitHub + Supabase
See `docs/GITHUB_DEPLOYMENT.md` and `SUPABASE.md`. Production secrets must stay outside the repository.
