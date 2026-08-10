CREATE TABLE IF NOT EXISTS leave_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type_id uuid NOT NULL REFERENCES leave_types(id),
  balance_year integer NOT NULL,
  opening_balance numeric(8,2) NOT NULL DEFAULT 0,
  accrued numeric(8,2) NOT NULL DEFAULT 0,
  used numeric(8,2) NOT NULL DEFAULT 0,
  adjusted numeric(8,2) NOT NULL DEFAULT 0,
  UNIQUE(organization_id, employee_id, leave_type_id, balance_year)
);

CREATE TABLE IF NOT EXISTS employee_compensation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  basic_salary numeric(14,3) NOT NULL DEFAULT 0,
  housing_allowance numeric(14,3) NOT NULL DEFAULT 0,
  transport_allowance numeric(14,3) NOT NULL DEFAULT 0,
  other_allowance numeric(14,3) NOT NULL DEFAULT 0,
  currency char(3) NOT NULL DEFAULT 'OMR',
  effective_from date NOT NULL,
  effective_to date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_employee_compensation_emp ON employee_compensation(organization_id, employee_id, is_active);

CREATE TABLE IF NOT EXISTS payroll_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  code varchar(40) NOT NULL,
  name varchar(120) NOT NULL,
  component_type varchar(20) NOT NULL CHECK(component_type IN ('EARNING','DEDUCTION')),
  calculation_type varchar(20) NOT NULL DEFAULT 'FIXED' CHECK(calculation_type IN ('FIXED','PERCENTAGE','VARIABLE')),
  default_amount numeric(14,3) NOT NULL DEFAULT 0,
  taxable boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  UNIQUE(organization_id, code)
);

CREATE TABLE IF NOT EXISTS recruitment_interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  scheduled_at timestamptz NOT NULL,
  interviewer_user_id uuid REFERENCES users(id),
  interview_type varchar(40) NOT NULL DEFAULT 'INTERVIEW',
  status workflow_status NOT NULL DEFAULT 'PENDING',
  score numeric(5,2),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recruitment_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  position_id uuid REFERENCES positions(id),
  offered_salary numeric(14,3),
  currency char(3) NOT NULL DEFAULT 'OMR',
  status workflow_status NOT NULL DEFAULT 'DRAFT',
  issued_on date,
  expires_on date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS probation_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  review_date date NOT NULL,
  reviewer_employee_id uuid REFERENCES employees(id),
  outcome varchar(30) NOT NULL DEFAULT 'PENDING',
  score numeric(5,2),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS document_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  code varchar(40) NOT NULL,
  name varchar(150) NOT NULL,
  category varchar(60) NOT NULL,
  body_template text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, code)
);

CREATE TABLE IF NOT EXISTS performance_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  title varchar(180) NOT NULL,
  description text,
  weight numeric(5,2) NOT NULL DEFAULT 0,
  target_value varchar(120),
  actual_value varchar(120),
  due_date date,
  status workflow_status NOT NULL DEFAULT 'DRAFT',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS performance_improvement_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  manager_employee_id uuid REFERENCES employees(id),
  title varchar(180) NOT NULL,
  objectives text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status workflow_status NOT NULL DEFAULT 'PENDING',
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK(end_date >= start_date)
);

CREATE TABLE IF NOT EXISTS training_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  course_id uuid NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES branches(id),
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  capacity integer NOT NULL DEFAULT 20 CHECK(capacity > 0),
  trainer varchar(160),
  status workflow_status NOT NULL DEFAULT 'PENDING',
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK(end_at > start_at)
);

CREATE TABLE IF NOT EXISTS employee_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  skill_name varchar(120) NOT NULL,
  level varchar(30) NOT NULL DEFAULT 'BASIC',
  verified_by_employee_id uuid REFERENCES employees(id),
  verified_at timestamptz,
  UNIQUE(organization_id, employee_id, skill_name)
);

CREATE TABLE IF NOT EXISTS workforce_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES branches(id),
  supervisor_employee_id uuid REFERENCES employees(id),
  assignment_type varchar(60) NOT NULL,
  assignment_date date NOT NULL,
  start_time time,
  end_time time,
  status workflow_status NOT NULL DEFAULT 'PENDING',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_workforce_assignments_date ON workforce_assignments(organization_id, assignment_date);

CREATE TABLE IF NOT EXISTS driver_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  license_no varchar(80) NOT NULL,
  license_type varchar(60),
  license_expiry date,
  vehicle_class varchar(60),
  eligible boolean NOT NULL DEFAULT true,
  status varchar(30) NOT NULL DEFAULT 'ACTIVE',
  UNIQUE(organization_id, employee_id),
  UNIQUE(organization_id, license_no)
);

CREATE TABLE IF NOT EXISTS hr_service_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  code varchar(40) NOT NULL,
  name varchar(150) NOT NULL,
  description text,
  sla_hours integer NOT NULL DEFAULT 72 CHECK(sla_hours > 0),
  active boolean NOT NULL DEFAULT true,
  UNIQUE(organization_id, code)
);

CREATE TABLE IF NOT EXISTS approval_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  entity_type varchar(60) NOT NULL,
  name varchar(150) NOT NULL,
  steps_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, entity_type, name)
);

CREATE TABLE IF NOT EXISTS offboarding_clearance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  offboarding_case_id uuid NOT NULL REFERENCES offboarding_cases(id) ON DELETE CASCADE,
  area varchar(60) NOT NULL,
  owner_user_id uuid REFERENCES users(id),
  status workflow_status NOT NULL DEFAULT 'PENDING',
  completed_at timestamptz,
  notes text,
  UNIQUE(offboarding_case_id, area)
);

CREATE TABLE IF NOT EXISTS exit_interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  offboarding_case_id uuid NOT NULL REFERENCES offboarding_cases(id) ON DELETE CASCADE,
  interviewed_at timestamptz,
  interviewer_user_id uuid REFERENCES users(id),
  reason_category varchar(80),
  feedback text,
  would_rehire boolean,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(offboarding_case_id)
);

CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  setting_key varchar(100) NOT NULL,
  category varchar(60) NOT NULL DEFAULT 'GENERAL',
  setting_value_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid REFERENCES users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, setting_key)
);

CREATE TABLE IF NOT EXISTS integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  name varchar(150) NOT NULL,
  integration_type varchar(60) NOT NULL,
  status varchar(30) NOT NULL DEFAULT 'DISABLED',
  config_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'leave_balances','employee_compensation','payroll_components','recruitment_interviews','recruitment_offers',
    'probation_reviews','document_templates','performance_goals','performance_improvement_plans','training_events',
    'employee_skills','workforce_assignments','driver_profiles','hr_service_catalog','approval_workflows',
    'offboarding_clearance','exit_interviews','system_settings','integrations'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON TABLE %I FROM anon, authenticated', t);
  END LOOP;
END $$;
