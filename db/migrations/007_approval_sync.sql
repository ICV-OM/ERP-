CREATE OR REPLACE FUNCTION public.sync_approval_entity_status() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER AS $$
BEGIN
  IF NEW.decision IS NULL OR NEW.decision IS NOT DISTINCT FROM OLD.decision THEN RETURN NEW; END IF;
  IF NEW.entity_type='leave_request' THEN
    UPDATE leave_requests SET
      status=CASE NEW.decision WHEN 'APPROVED' THEN 'APPROVED'::workflow_status WHEN 'REJECTED' THEN 'REJECTED'::workflow_status WHEN 'RETURNED' THEN 'PENDING'::workflow_status ELSE status END,
      current_approver_user_id=CASE WHEN NEW.decision IN ('APPROVED','REJECTED') THEN NULL ELSE current_approver_user_id END,
      updated_at=now()
    WHERE id=NEW.entity_id AND organization_id=NEW.organization_id;
  ELSIF NEW.entity_type='hr_request' THEN
    UPDATE hr_requests SET
      status=CASE NEW.decision WHEN 'APPROVED' THEN 'APPROVED'::workflow_status WHEN 'REJECTED' THEN 'REJECTED'::workflow_status WHEN 'RETURNED' THEN 'PENDING'::workflow_status ELSE status END,
      updated_at=now()
    WHERE id=NEW.entity_id AND organization_id=NEW.organization_id;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_sync_approval_entity_status ON approval_actions;
CREATE TRIGGER trg_sync_approval_entity_status AFTER UPDATE OF decision ON approval_actions FOR EACH ROW EXECUTE FUNCTION public.sync_approval_entity_status();
REVOKE ALL ON FUNCTION public.sync_approval_entity_status() FROM PUBLIC,anon,authenticated;
