CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE user_role AS ENUM ('SUPER_ADMIN','HR_ADMIN','HR_MANAGER','MANAGER','PAYROLL','RECRUITER','EMPLOYEE','AUDITOR');
CREATE TYPE employee_status AS ENUM ('ACTIVE','ON_LEAVE','SUSPENDED','TERMINATED');
CREATE TYPE employment_type AS ENUM ('FULL_TIME','PART_TIME','CONTRACT','TEMPORARY');
CREATE TYPE workflow_status AS ENUM ('DRAFT','PENDING','APPROVED','REJECTED','CANCELLED','COMPLETED');

CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(180) NOT NULL,
  code varchar(30) NOT NULL UNIQUE,
  timezone varchar(80) NOT NULL DEFAULT 'Asia/Muscat',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE legal_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id),
  name varchar(180) NOT NULL, country_code char(2) NOT NULL, registration_no varchar(80), currency char(3) NOT NULL,
  is_active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_legal_entities_org ON legal_entities(organization_id);
CREATE TABLE branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id), legal_entity_id uuid REFERENCES legal_entities(id),
  name varchar(150) NOT NULL, code varchar(30) NOT NULL, country_code char(2) NOT NULL, city varchar(100), location_type varchar(40) DEFAULT 'OFFICE', is_active boolean DEFAULT true,
  UNIQUE(organization_id, code)
);
CREATE INDEX idx_branches_org ON branches(organization_id);
CREATE TABLE departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id), parent_id uuid REFERENCES departments(id),
  name varchar(150) NOT NULL, code varchar(30) NOT NULL, cost_center varchar(50), is_active boolean DEFAULT true, UNIQUE(organization_id,code)
);
CREATE INDEX idx_departments_org ON departments(organization_id);
CREATE TABLE positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id), department_id uuid REFERENCES departments(id), branch_id uuid REFERENCES branches(id),
  title varchar(150) NOT NULL, code varchar(40) NOT NULL, grade varchar(30), reports_to_position_id uuid REFERENCES positions(id), status varchar(30) DEFAULT 'ACTIVE', UNIQUE(organization_id,code)
);

CREATE TABLE employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id),
  employee_no varchar(30) NOT NULL, first_name varchar(80) NOT NULL, last_name varchar(80) NOT NULL,
  work_email varchar(254) NOT NULL, phone varchar(30), job_title varchar(120) NOT NULL,
  department_id uuid REFERENCES departments(id), branch_id uuid REFERENCES branches(id), position_id uuid REFERENCES positions(id), manager_employee_id uuid REFERENCES employees(id),
  employment_type employment_type NOT NULL, hire_date date NOT NULL, status employee_status NOT NULL DEFAULT 'ACTIVE',
  nationality varchar(80), date_of_birth date, emergency_contact_name varchar(150), emergency_contact_phone varchar(30),
  created_by uuid, updated_by uuid, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz,
  UNIQUE(organization_id, employee_no), UNIQUE(organization_id, work_email)
);
CREATE INDEX idx_employees_org_status ON employees(organization_id,status) WHERE deleted_at IS NULL;
CREATE INDEX idx_employees_branch ON employees(organization_id,branch_id) WHERE deleted_at IS NULL;

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id), branch_id uuid REFERENCES branches(id), employee_id uuid REFERENCES employees(id),
  email varchar(254) NOT NULL UNIQUE, display_name varchar(160) NOT NULL, password_hash text NOT NULL, role user_role NOT NULL,
  is_active boolean NOT NULL DEFAULT true, last_login_at timestamptz, password_changed_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE employees ADD CONSTRAINT fk_employee_created_by FOREIGN KEY(created_by) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE employees ADD CONSTRAINT fk_employee_updated_by FOREIGN KEY(updated_by) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE sessions (
  id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, token_hash char(64) NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL, revoked_at timestamptz, ip_hash varchar(64), user_agent_hash varchar(64), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sessions_user_active ON sessions(user_id,expires_at) WHERE revoked_at IS NULL;
CREATE TABLE auth_rate_limits (
  id_hash char(64) PRIMARY KEY, attempts integer NOT NULL DEFAULT 0, window_started_at timestamptz NOT NULL DEFAULT now(), locked_until timestamptz
);

CREATE TABLE employee_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id), employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  type varchar(50) NOT NULL, document_no varchar(100), issued_on date, expires_on date, storage_key text NOT NULL, classification varchar(30) NOT NULL DEFAULT 'CONFIDENTIAL', created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_documents_expiry ON employee_documents(organization_id,expires_on);

CREATE TABLE shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id), name varchar(100) NOT NULL,
  start_time time NOT NULL, end_time time NOT NULL, break_minutes integer NOT NULL DEFAULT 0, overnight boolean NOT NULL DEFAULT false, is_active boolean DEFAULT true
);
CREATE TABLE shift_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id), employee_id uuid NOT NULL REFERENCES employees(id), shift_id uuid NOT NULL REFERENCES shifts(id),
  branch_id uuid REFERENCES branches(id), assignment_date date NOT NULL, supervisor_employee_id uuid REFERENCES employees(id), UNIQUE(employee_id,assignment_date)
);
CREATE TABLE attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id), employee_id uuid NOT NULL REFERENCES employees(id),
  work_date date NOT NULL, clock_in timestamptz, clock_out timestamptz, status varchar(30) NOT NULL DEFAULT 'PRESENT', source varchar(30) NOT NULL DEFAULT 'MANUAL',
  overtime_minutes integer NOT NULL DEFAULT 0, correction_status workflow_status DEFAULT 'DRAFT', created_at timestamptz DEFAULT now(), UNIQUE(employee_id,work_date)
);

CREATE TABLE leave_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id), name varchar(100) NOT NULL, code varchar(30) NOT NULL,
  annual_entitlement numeric(6,2) NOT NULL DEFAULT 0, requires_attachment boolean DEFAULT false, is_active boolean DEFAULT true, UNIQUE(organization_id,code)
);
CREATE TABLE leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id), employee_id uuid NOT NULL REFERENCES employees(id), leave_type_id uuid NOT NULL REFERENCES leave_types(id),
  start_date date NOT NULL, end_date date NOT NULL, reason varchar(500), status workflow_status NOT NULL DEFAULT 'PENDING', current_approver_user_id uuid REFERENCES users(id),
  created_by uuid REFERENCES users(id), created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), CHECK(end_date>=start_date)
);

CREATE TABLE payroll_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id), legal_entity_id uuid REFERENCES legal_entities(id),
  period_year integer NOT NULL, period_month integer NOT NULL CHECK(period_month BETWEEN 1 AND 12), currency char(3) NOT NULL, status workflow_status NOT NULL DEFAULT 'DRAFT',
  gross_total numeric(16,3) DEFAULT 0, deductions_total numeric(16,3) DEFAULT 0, net_total numeric(16,3) DEFAULT 0, created_at timestamptz DEFAULT now(), UNIQUE(organization_id,legal_entity_id,period_year,period_month)
);
CREATE TABLE payslips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id), payroll_run_id uuid NOT NULL REFERENCES payroll_runs(id), employee_id uuid NOT NULL REFERENCES employees(id),
  basic_salary numeric(14,3) NOT NULL DEFAULT 0, allowances numeric(14,3) NOT NULL DEFAULT 0, overtime numeric(14,3) NOT NULL DEFAULT 0, incentives numeric(14,3) NOT NULL DEFAULT 0,
  deductions numeric(14,3) NOT NULL DEFAULT 0, net_salary numeric(14,3) NOT NULL DEFAULT 0, currency char(3) NOT NULL
);

CREATE TABLE recruitment_requisitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id), position_id uuid REFERENCES positions(id), branch_id uuid REFERENCES branches(id),
  title varchar(150) NOT NULL, openings integer NOT NULL DEFAULT 1, status workflow_status DEFAULT 'PENDING', requested_by uuid REFERENCES users(id), created_at timestamptz DEFAULT now()
);
CREATE TABLE candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id), requisition_id uuid REFERENCES recruitment_requisitions(id),
  full_name varchar(160) NOT NULL, email varchar(254), phone varchar(30), stage varchar(40) DEFAULT 'APPLIED', source varchar(60), created_at timestamptz DEFAULT now()
);
CREATE TABLE onboarding_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id), employee_id uuid NOT NULL REFERENCES employees(id),
  title varchar(180) NOT NULL, owner_type varchar(30) NOT NULL, due_date date, status workflow_status DEFAULT 'PENDING', completed_at timestamptz
);
CREATE TABLE performance_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id), employee_id uuid NOT NULL REFERENCES employees(id), reviewer_employee_id uuid REFERENCES employees(id),
  cycle varchar(80) NOT NULL, status workflow_status DEFAULT 'DRAFT', score numeric(5,2), summary text, created_at timestamptz DEFAULT now()
);
CREATE TABLE training_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id), code varchar(30) NOT NULL, title varchar(180) NOT NULL,
  mandatory boolean DEFAULT false, validity_months integer, active boolean DEFAULT true, UNIQUE(organization_id,code)
);
CREATE TABLE training_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id), employee_id uuid NOT NULL REFERENCES employees(id), course_id uuid NOT NULL REFERENCES training_courses(id),
  status workflow_status DEFAULT 'PENDING', completed_on date, expires_on date, certificate_storage_key text
);
CREATE TABLE assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id), asset_no varchar(60) NOT NULL, category varchar(60) NOT NULL, description varchar(180), status varchar(30) DEFAULT 'AVAILABLE', UNIQUE(organization_id,asset_no)
);
CREATE TABLE asset_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id), asset_id uuid NOT NULL REFERENCES assets(id), employee_id uuid NOT NULL REFERENCES employees(id),
  assigned_at timestamptz NOT NULL DEFAULT now(), returned_at timestamptz, condition_on_return varchar(80)
);
CREATE TABLE hr_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id), employee_id uuid NOT NULL REFERENCES employees(id), type varchar(80) NOT NULL,
  subject varchar(180) NOT NULL, details text, status workflow_status DEFAULT 'PENDING', assigned_to_user_id uuid REFERENCES users(id), created_at timestamptz DEFAULT now()
);
CREATE TABLE approval_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id), entity_type varchar(60) NOT NULL, entity_id uuid NOT NULL,
  step_no integer NOT NULL, approver_user_id uuid NOT NULL REFERENCES users(id), decision varchar(30), comments varchar(500), decided_at timestamptz, created_at timestamptz DEFAULT now()
);
CREATE TABLE employee_relations_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id), employee_id uuid REFERENCES employees(id), case_type varchar(50) NOT NULL,
  title varchar(180) NOT NULL, details text, status workflow_status DEFAULT 'PENDING', classification varchar(30) DEFAULT 'RESTRICTED', owner_user_id uuid REFERENCES users(id), created_at timestamptz DEFAULT now()
);
CREATE TABLE offboarding_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id), employee_id uuid NOT NULL REFERENCES employees(id), reason varchar(80) NOT NULL,
  last_working_day date NOT NULL, status workflow_status DEFAULT 'PENDING', final_settlement_status varchar(30) DEFAULT 'PENDING', access_closed_at timestamptz, created_at timestamptz DEFAULT now()
);
CREATE TABLE audit_logs (
  id bigserial PRIMARY KEY, organization_id uuid NOT NULL REFERENCES organizations(id), actor_user_id uuid REFERENCES users(id), action varchar(120) NOT NULL,
  entity_type varchar(80) NOT NULL, entity_id varchar(80), before_json jsonb, after_json jsonb, request_id varchar(80), ip_hash varchar(64), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_org_date ON audit_logs(organization_id,created_at DESC);

-- Database hardening: app objects are organization-scoped. Application queries must always bind organization_id.
-- Production recommendation: run the app with a non-owner DB role and grant only required SELECT/INSERT/UPDATE permissions.
