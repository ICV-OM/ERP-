# Supabase deployment

ALTURUD People ERP uses PostgreSQL through the server-side `pg` driver. Supabase hosts the production PostgreSQL database; browser clients never receive database credentials.

## 1. Apply migrations
Apply in order:

1. `db/migrations/001_init.sql`
2. `db/migrations/002_supabase_hardening.sql`

The second migration enables RLS on HR tables and removes Data API access from the `anon` and `authenticated` roles. The application continues to enforce organization scoping, RBAC and record-level authorization on the server.

## 2. Production environment
Set secrets only in your deployment platform (for example Vercel), never in GitHub:

```env
DATABASE_URL=postgresql://...SUPABASE_POOLED_CONNECTION_STRING...
SESSION_SECRET=GENERATE_A_LONG_RANDOM_SECRET
APP_ORIGIN=https://your-production-domain.example
COOKIE_SECURE=true
SESSION_TTL_HOURS=8
```

For serverless hosting, prefer the Supabase pooled connection string. Keep `.env.local` private and never commit a database password.

## 3. Seed once
Set strong temporary seed credentials in the deployment/admin environment and run `npm run db:seed` once. Rotate/remove seed values afterward.

## 4. Security review
Before production:

- Run Supabase Security and Performance Advisors.
- Use a least-privileged database role for the deployed application when practical.
- Keep production and development projects separate.
- Enable backups/PITR according to the selected Supabase plan.
- Never expose `DATABASE_URL`, service-role keys, or `SESSION_SECRET` to browser code.
