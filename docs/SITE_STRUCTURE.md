# ALTURUD People ERP — Site Structure

## Route groups

### Public
- `/login` — secure authentication

### Protected core
- `/dashboard` — executive / role-aware dashboard
- `/employees` — employee directory scoped by role
- `/employees/new` — create employee (HR write permission)
- `/employees/[id]` — employee profile with self/team/HR data scoping

### Organization
- `/organization`
  - `/organization/companies`
  - `/organization/branches`
  - `/organization/departments`
  - `/organization/org-chart`
  - `/organization/positions`

### Workforce operations
- `/attendance`
  - `/attendance/today`
  - `/attendance/timesheets`
  - `/attendance/exceptions`
  - `/attendance/overtime`
- `/shifts`
  - `/shifts/planner`
  - `/shifts/templates`
  - `/shifts/assignments`
- `/leave`
  - `/leave/requests`
  - `/leave/balances`
  - `/leave/calendar`
  - `/leave/policies`
- `/workforce`
  - `/workforce/availability`
  - `/workforce/assignments`
  - `/workforce/drivers`

### Employee lifecycle
- `/recruitment`
  - requisitions, vacancies, candidates, interviews, offers
- `/onboarding`
  - new hires, checklists, probation
- `/performance`
  - goals, reviews, calibration, improvement plans
- `/training`
  - catalog, calendar, mandatory training, skills matrix
- `/offboarding`
  - cases, clearance, exit interviews, final settlement

### HR services & compliance
- `/documents`
  - employee documents, expiry center, templates
- `/assets`
  - inventory, assignments, returns
- `/requests`
  - my requests, service catalog, HR cases
- `/approvals`
  - pending, history, workflow monitor
- `/relations`
  - cases, grievances, disciplinary actions, incidents

### Payroll & analytics
- `/payroll`
  - payroll runs, salaries, components, overtime/incentives, payslips
- `/reports`
  - workforce, attendance, payroll, recruitment, document compliance

### Administration
- `/admin`
  - users
  - roles & permissions
  - settings
  - workflows
  - integrations
  - audit

## Application layering

```text
Browser / UI
   ↓
Next.js Proxy
   ├─ CSP + security headers
   ├─ signed session gate
   └─ request ID / no-store
   ↓
Protected Pages / Route Handlers
   ├─ server-side session revalidation
   ├─ RBAC permission checks
   ├─ CSRF + Origin checks on writes
   ├─ Zod input validation
   └─ organization / self / team data scope
   ↓
Data Access Layer
   ├─ parameterized SQL
   ├─ transactions
   └─ audit log
   ↓
PostgreSQL
```

## Structure principles

- Route hierarchy mirrors business domains, not database tables.
- Shared UI components are separated from business/data services.
- Security checks occur server-side before database actions.
- All sensitive business modules are protected by explicit permissions.
- Employee data is scoped to organization and role.
- Database migrations are version-controlled.
- Business rules that differ by country are configurable rather than hard-coded.
