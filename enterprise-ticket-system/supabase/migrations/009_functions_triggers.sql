-- ============================================================
-- Migration 009: Database Functions and Triggers
-- ============================================================

-- ============================================================
-- FUNCTION: update_updated_at()
-- Generic trigger to auto-update the updated_at column
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all relevant tables
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_roles_updated_at
  BEFORE UPDATE ON public.roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_priorities_updated_at
  BEFORE UPDATE ON public.priorities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_statuses_updated_at
  BEFORE UPDATE ON public.statuses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_ticket_types_updated_at
  BEFORE UPDATE ON public.ticket_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_queues_updated_at
  BEFORE UPDATE ON public.queues
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_tickets_updated_at
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_comments_updated_at
  BEFORE UPDATE ON public.ticket_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_workflow_definitions_updated_at
  BEFORE UPDATE ON public.workflow_definitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_workflow_transitions_updated_at
  BEFORE UPDATE ON public.workflow_transitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_sla_policies_updated_at
  BEFORE UPDATE ON public.sla_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_business_hours_updated_at
  BEFORE UPDATE ON public.business_hours
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_escalation_matrices_updated_at
  BEFORE UPDATE ON public.escalation_matrices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_automation_rules_updated_at
  BEFORE UPDATE ON public.automation_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_notification_templates_updated_at
  BEFORE UPDATE ON public.notification_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- FUNCTION: generate_ticket_number()
-- Generates TICK-00001 format ticket numbers atomically
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS TRIGGER AS $$
DECLARE
  next_num INT;
BEGIN
  -- Lock to prevent race conditions
  PERFORM pg_advisory_xact_lock(hashtext('ticket_number_gen'));

  SELECT COALESCE(
    MAX(CAST(SUBSTRING(ticket_number FROM 6) AS INT)), 0
  ) + 1
  INTO next_num
  FROM public.tickets;

  NEW.ticket_number := 'TICK-' || LPAD(next_num::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ticket_number
  BEFORE INSERT ON public.tickets
  FOR EACH ROW
  WHEN (NEW.ticket_number IS NULL OR NEW.ticket_number = '')
  EXECUTE FUNCTION public.generate_ticket_number();

-- ============================================================
-- FUNCTION: create_audit_log()
-- Generic audit trigger function
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_audit_log()
RETURNS TRIGGER AS $$
DECLARE
  old_json JSONB := '{}';
  new_json JSONB := '{}';
  action_name TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    new_json := to_jsonb(NEW);
    action_name := 'created';
  ELSIF TG_OP = 'UPDATE' THEN
    old_json := to_jsonb(OLD);
    new_json := to_jsonb(NEW);
    action_name := 'updated';

    -- Detect specific ticket status change
    IF TG_TABLE_NAME = 'tickets' AND OLD.status_id IS DISTINCT FROM NEW.status_id THEN
      action_name := 'status_changed';
    ELSIF TG_TABLE_NAME = 'tickets' AND OLD.assignee_id IS DISTINCT FROM NEW.assignee_id THEN
      action_name := 'reassigned';
    ELSIF TG_TABLE_NAME = 'tickets' AND OLD.priority_id IS DISTINCT FROM NEW.priority_id THEN
      action_name := 'priority_changed';
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    old_json := to_jsonb(OLD);
    action_name := 'deleted';
  END IF;

  INSERT INTO public.audit_logs (
    entity_type, entity_id, action, actor_id, old_values, new_values
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    action_name,
    auth.uid(),
    old_json,
    new_json
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit trigger to tickets table
CREATE TRIGGER trg_tickets_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.create_audit_log();

-- Apply audit trigger to ticket comments
CREATE TRIGGER trg_comments_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.ticket_comments
  FOR EACH ROW EXECUTE FUNCTION public.create_audit_log();

-- ============================================================
-- FUNCTION: handle_new_user()
-- Creates profile automatically when auth.users row is inserted
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_role_id UUID;
BEGIN
  -- Get the 'end_user' role id
  SELECT id INTO default_role_id
  FROM public.roles
  WHERE slug = 'end_user'
  LIMIT 1;

  -- Insert profile record
  INSERT INTO public.profiles (id, email, full_name, role_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      SPLIT_PART(NEW.email, '@', 1)
    ),
    default_role_id
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- FUNCTION: set_first_response_at()
-- Sets first_response_at on ticket when first agent comment is added
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_first_response_at()
RETURNS TRIGGER AS $$
DECLARE
  ticket_requester UUID;
  commenter_role TEXT;
BEGIN
  -- Only proceed if first_response_at is not already set
  SELECT requester_id INTO ticket_requester
  FROM public.tickets WHERE id = NEW.ticket_id;

  -- Only set if the commenter is not the requester (i.e., agent responded)
  IF NEW.author_id != ticket_requester AND NOT NEW.is_internal THEN
    UPDATE public.tickets
    SET first_response_at = NOW()
    WHERE id = NEW.ticket_id AND first_response_at IS NULL;

    -- Mark SLA response event as met
    UPDATE public.sla_events
    SET met_at = NOW(), is_breached = FALSE
    WHERE ticket_id = NEW.ticket_id
      AND event_type = 'response'
      AND met_at IS NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_first_response
  AFTER INSERT ON public.ticket_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_first_response_at();

-- ============================================================
-- FUNCTION: handle_ticket_resolved()
-- Sets resolved_at and marks SLA resolution when status changes to resolved
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_ticket_status_change()
RETURNS TRIGGER AS $$
DECLARE
  new_status_category TEXT;
BEGIN
  IF OLD.status_id IS DISTINCT FROM NEW.status_id THEN
    -- Get new status category
    SELECT category INTO new_status_category
    FROM public.statuses
    WHERE id = NEW.status_id;

    -- Handle resolved
    IF new_status_category = 'resolved' AND OLD.resolved_at IS NULL THEN
      NEW.resolved_at := NOW();

      -- Mark SLA resolution as met
      UPDATE public.sla_events
      SET met_at = NOW(),
          is_breached = (due_at < NOW())
      WHERE ticket_id = NEW.id
        AND event_type = 'resolution'
        AND met_at IS NULL;
    END IF;

    -- Handle closed
    IF new_status_category = 'closed' AND OLD.closed_at IS NULL THEN
      NEW.closed_at := NOW();
    END IF;

    -- Handle pending (pause SLA)
    IF new_status_category = 'pending' THEN
      UPDATE public.sla_events
      SET paused_at = NOW(),
          pause_reason = 'Status changed to pending'
      WHERE ticket_id = NEW.id
        AND paused_at IS NULL
        AND met_at IS NULL;
    END IF;

    -- Handle resuming from pending
    IF new_status_category IN ('open', 'in_progress') THEN
      UPDATE public.sla_events
      SET due_at = due_at + (NOW() - paused_at),
          total_pause_mins = total_pause_mins + EXTRACT(EPOCH FROM (NOW() - paused_at)) / 60,
          paused_at = NULL,
          pause_reason = NULL
      WHERE ticket_id = NEW.id
        AND paused_at IS NOT NULL
        AND met_at IS NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_ticket_status_change
  BEFORE UPDATE OF status_id ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.handle_ticket_status_change();
