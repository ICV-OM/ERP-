CREATE UNIQUE INDEX IF NOT EXISTS uq_payslips_run_employee ON payslips(payroll_run_id,employee_id);
