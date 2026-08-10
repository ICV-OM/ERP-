CREATE OR REPLACE FUNCTION public.sync_asset_assignment_status() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER AS $$
BEGIN
  IF TG_OP='DELETE' THEN
    UPDATE assets SET status='AVAILABLE' WHERE id=OLD.asset_id AND organization_id=OLD.organization_id;
    RETURN OLD;
  END IF;
  IF NEW.returned_at IS NULL THEN
    UPDATE assets SET status='ASSIGNED' WHERE id=NEW.asset_id AND organization_id=NEW.organization_id;
  ELSE
    UPDATE assets SET status='AVAILABLE' WHERE id=NEW.asset_id AND organization_id=NEW.organization_id;
  END IF;
  IF TG_OP='UPDATE' AND OLD.asset_id IS DISTINCT FROM NEW.asset_id THEN
    UPDATE assets SET status='AVAILABLE' WHERE id=OLD.asset_id AND organization_id=OLD.organization_id;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_asset_assignment_status ON asset_assignments;
CREATE TRIGGER trg_asset_assignment_status AFTER INSERT OR UPDATE OR DELETE ON asset_assignments FOR EACH ROW EXECUTE FUNCTION public.sync_asset_assignment_status();

CREATE OR REPLACE FUNCTION public.calc_payslip_net() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER AS $$
BEGIN
  NEW.net_salary:=COALESCE(NEW.basic_salary,0)+COALESCE(NEW.allowances,0)+COALESCE(NEW.overtime,0)+COALESCE(NEW.incentives,0)-COALESCE(NEW.deductions,0);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_calc_payslip_net ON payslips;
CREATE TRIGGER trg_calc_payslip_net BEFORE INSERT OR UPDATE ON payslips FOR EACH ROW EXECUTE FUNCTION public.calc_payslip_net();

CREATE OR REPLACE FUNCTION public.recalc_payroll_run(p_run uuid) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER AS $$
BEGIN
  UPDATE payroll_runs pr SET
    gross_total=x.gross_total,
    deductions_total=x.deductions_total,
    net_total=x.net_total
  FROM (
    SELECT p_run id,
      COALESCE(SUM(basic_salary+allowances+overtime+incentives),0) gross_total,
      COALESCE(SUM(deductions),0) deductions_total,
      COALESCE(SUM(net_salary),0) net_total
    FROM payslips WHERE payroll_run_id=p_run
  ) x WHERE pr.id=x.id;
END $$;
CREATE OR REPLACE FUNCTION public.sync_payroll_run_totals() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER AS $$
BEGIN
  IF TG_OP='DELETE' THEN PERFORM public.recalc_payroll_run(OLD.payroll_run_id); RETURN OLD; END IF;
  PERFORM public.recalc_payroll_run(NEW.payroll_run_id);
  IF TG_OP='UPDATE' AND OLD.payroll_run_id IS DISTINCT FROM NEW.payroll_run_id THEN PERFORM public.recalc_payroll_run(OLD.payroll_run_id); END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_sync_payroll_run_totals ON payslips;
CREATE TRIGGER trg_sync_payroll_run_totals AFTER INSERT OR UPDATE OR DELETE ON payslips FOR EACH ROW EXECUTE FUNCTION public.sync_payroll_run_totals();

CREATE OR REPLACE FUNCTION public.recalc_leave_balance(p_org uuid,p_emp uuid,p_type uuid,p_year integer) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE v_used numeric(8,2); v_entitlement numeric(8,2);
BEGIN
  SELECT COALESCE(SUM((end_date-start_date)+1),0)::numeric(8,2) INTO v_used
  FROM leave_requests WHERE organization_id=p_org AND employee_id=p_emp AND leave_type_id=p_type AND status='APPROVED' AND EXTRACT(YEAR FROM start_date)::integer=p_year;
  SELECT annual_entitlement INTO v_entitlement FROM leave_types WHERE id=p_type AND organization_id=p_org;
  INSERT INTO leave_balances(organization_id,employee_id,leave_type_id,balance_year,opening_balance,used)
  VALUES(p_org,p_emp,p_type,p_year,COALESCE(v_entitlement,0),COALESCE(v_used,0))
  ON CONFLICT(organization_id,employee_id,leave_type_id,balance_year)
  DO UPDATE SET used=EXCLUDED.used;
END $$;
CREATE OR REPLACE FUNCTION public.sync_leave_balance() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER AS $$
BEGIN
  IF TG_OP<>'INSERT' THEN PERFORM public.recalc_leave_balance(OLD.organization_id,OLD.employee_id,OLD.leave_type_id,EXTRACT(YEAR FROM OLD.start_date)::integer); END IF;
  IF TG_OP<>'DELETE' THEN PERFORM public.recalc_leave_balance(NEW.organization_id,NEW.employee_id,NEW.leave_type_id,EXTRACT(YEAR FROM NEW.start_date)::integer); END IF;
  RETURN COALESCE(NEW,OLD);
END $$;
DROP TRIGGER IF EXISTS trg_sync_leave_balance ON leave_requests;
CREATE TRIGGER trg_sync_leave_balance AFTER INSERT OR UPDATE OR DELETE ON leave_requests FOR EACH ROW EXECUTE FUNCTION public.sync_leave_balance();

CREATE OR REPLACE FUNCTION public.sync_onboarding_completion() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER AS $$
BEGIN
  IF NEW.status='COMPLETED' AND NEW.completed_at IS NULL THEN NEW.completed_at=now(); END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_sync_onboarding_completion ON onboarding_tasks;
CREATE TRIGGER trg_sync_onboarding_completion BEFORE INSERT OR UPDATE ON onboarding_tasks FOR EACH ROW EXECUTE FUNCTION public.sync_onboarding_completion();

CREATE OR REPLACE FUNCTION public.sync_training_expiry() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE months integer;
BEGIN
  IF NEW.status='COMPLETED' AND NEW.completed_on IS NOT NULL THEN
    SELECT validity_months INTO months FROM training_courses WHERE id=NEW.course_id;
    IF months IS NOT NULL THEN NEW.expires_on=(NEW.completed_on + make_interval(months=>months))::date; END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_sync_training_expiry ON training_enrollments;
CREATE TRIGGER trg_sync_training_expiry BEFORE INSERT OR UPDATE ON training_enrollments FOR EACH ROW EXECUTE FUNCTION public.sync_training_expiry();

CREATE OR REPLACE FUNCTION public.sync_approval_decision_time() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER AS $$
BEGIN
  IF NEW.decision IS NOT NULL AND NEW.decided_at IS NULL THEN NEW.decided_at=now(); END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_sync_approval_decision_time ON approval_actions;
CREATE TRIGGER trg_sync_approval_decision_time BEFORE INSERT OR UPDATE ON approval_actions FOR EACH ROW EXECUTE FUNCTION public.sync_approval_decision_time();

CREATE OR REPLACE FUNCTION public.sync_offboarding_completion() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER AS $$
BEGIN
  IF NEW.status='COMPLETED' THEN
    IF NEW.access_closed_at IS NULL THEN NEW.access_closed_at=now(); END IF;
    UPDATE employees SET status='TERMINATED',updated_at=now() WHERE id=NEW.employee_id AND organization_id=NEW.organization_id;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_sync_offboarding_completion ON offboarding_cases;
CREATE TRIGGER trg_sync_offboarding_completion BEFORE INSERT OR UPDATE ON offboarding_cases FOR EACH ROW EXECUTE FUNCTION public.sync_offboarding_completion();

REVOKE ALL ON FUNCTION public.sync_asset_assignment_status() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.calc_payslip_net() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.recalc_payroll_run(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.sync_payroll_run_totals() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.recalc_leave_balance(uuid,uuid,uuid,integer) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.sync_leave_balance() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.sync_onboarding_completion() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.sync_training_expiry() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.sync_approval_decision_time() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.sync_offboarding_completion() FROM PUBLIC,anon,authenticated;
