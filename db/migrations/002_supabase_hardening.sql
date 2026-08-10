-- Supabase hardening: the application accesses PostgreSQL only from the trusted server.
-- Prevent accidental exposure through Supabase Data API roles.

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'organizations','legal_entities','branches','departments','positions','employees','users','sessions',
    'auth_rate_limits','employee_documents','shifts','shift_assignments','attendance_records','leave_types',
    'leave_requests','payroll_runs','payslips','recruitment_requisitions','candidates','onboarding_tasks',
    'performance_reviews','training_courses','training_enrollments','assets','asset_assignments','hr_requests',
    'approval_actions','employee_relations_cases','offboarding_cases','audit_logs'
  ]
  LOOP
    IF to_regclass('public.' || tbl) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', tbl);
    END IF;
  END LOOP;
END $$;

REVOKE CREATE ON SCHEMA public FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
