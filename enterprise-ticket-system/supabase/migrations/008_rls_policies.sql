-- ============================================================
-- Migration 008: Row Level Security (RLS) Policies
-- Enable RLS on all tables and define access policies
-- ============================================================

-- ============================================================
-- Helper Function: get_user_role()
-- Returns the current user's role slug
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT r.slug
  FROM public.profiles p
  JOIN public.roles r ON r.id = p.role_id
  WHERE p.id = auth.uid()
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================================
-- Enable RLS on all tables
-- ============================================================
ALTER TABLE public.profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.priorities            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.statuses              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_types          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queues                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_members         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_links          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_comments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_attachments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_watchers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_definitions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_transitions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_rules        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_requests     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_hours        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_policies          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_events            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalation_matrices   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalation_rules      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalation_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_rules      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_configs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_catalog       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_fields         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys              ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PROFILES policies
-- ============================================================
CREATE POLICY "profiles_select_own_or_admin"
  ON public.profiles FOR SELECT
  USING (
    id = auth.uid()
    OR public.get_user_role() IN ('super_admin', 'admin')
    OR public.get_user_role() IN ('agent')  -- agents can see other profiles for assignment
  );

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_admin_all"
  ON public.profiles FOR ALL
  USING (public.get_user_role() IN ('super_admin', 'admin'));

-- ============================================================
-- TICKETS policies
-- ============================================================
CREATE POLICY "tickets_end_user_select_own"
  ON public.tickets FOR SELECT
  USING (
    public.get_user_role() IN ('super_admin', 'admin')
    OR (public.get_user_role() = 'agent' AND (
      assignee_id = auth.uid()
      OR queue_id IN (
        SELECT qm.queue_id FROM public.queue_members qm WHERE qm.agent_id = auth.uid()
      )
    ))
    OR requester_id = auth.uid()
  );

CREATE POLICY "tickets_authenticated_insert"
  ON public.tickets FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND created_by = auth.uid()
  );

CREATE POLICY "tickets_update_agent_admin"
  ON public.tickets FOR UPDATE
  USING (
    public.get_user_role() IN ('super_admin', 'admin')
    OR (public.get_user_role() = 'agent' AND assignee_id = auth.uid())
    OR requester_id = auth.uid()  -- requester can update title/description
  );

CREATE POLICY "tickets_delete_admin"
  ON public.tickets FOR DELETE
  USING (public.get_user_role() IN ('super_admin', 'admin'));

-- ============================================================
-- TICKET COMMENTS policies
-- ============================================================
CREATE POLICY "comments_select"
  ON public.ticket_comments FOR SELECT
  USING (
    public.get_user_role() IN ('super_admin', 'admin', 'agent')
    OR (public.get_user_role() = 'end_user' AND is_internal = FALSE AND EXISTS (
      SELECT 1 FROM public.tickets t WHERE t.id = ticket_id AND t.requester_id = auth.uid()
    ))
  );

CREATE POLICY "comments_insert_authenticated"
  ON public.ticket_comments FOR INSERT
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "comments_update_own"
  ON public.ticket_comments FOR UPDATE
  USING (author_id = auth.uid() OR public.get_user_role() IN ('super_admin', 'admin'));

CREATE POLICY "comments_delete_own_or_admin"
  ON public.ticket_comments FOR DELETE
  USING (author_id = auth.uid() OR public.get_user_role() IN ('super_admin', 'admin'));

-- ============================================================
-- TICKET ATTACHMENTS policies
-- ============================================================
CREATE POLICY "attachments_select"
  ON public.ticket_attachments FOR SELECT
  USING (
    public.get_user_role() IN ('super_admin', 'admin', 'agent')
    OR uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_id AND t.requester_id = auth.uid()
    )
  );

CREATE POLICY "attachments_insert_authenticated"
  ON public.ticket_attachments FOR INSERT
  WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "attachments_delete_own_or_admin"
  ON public.ticket_attachments FOR DELETE
  USING (uploaded_by = auth.uid() OR public.get_user_role() IN ('super_admin', 'admin'));

-- ============================================================
-- NOTIFICATIONS - user sees only their own
-- ============================================================
CREATE POLICY "notifications_own_all"
  ON public.notifications FOR ALL
  USING (user_id = auth.uid());

-- ============================================================
-- AUDIT LOGS - admin and super_admin only
-- ============================================================
CREATE POLICY "audit_logs_admin_read"
  ON public.audit_logs FOR SELECT
  USING (public.get_user_role() IN ('super_admin', 'admin'));

CREATE POLICY "audit_logs_system_insert"
  ON public.audit_logs FOR INSERT
  WITH CHECK (true);  -- inserts come from triggers (SECURITY DEFINER)

-- ============================================================
-- API KEYS - users see/manage their own
-- ============================================================
CREATE POLICY "api_keys_own"
  ON public.api_keys FOR ALL
  USING (user_id = auth.uid() OR public.get_user_role() = 'super_admin');

-- ============================================================
-- MASTER DATA: Read for all authenticated, Write for admin+
-- Applies to: roles, departments, priorities, statuses, categories,
--             ticket_types, queues, workflow_definitions, etc.
-- ============================================================

-- Roles
CREATE POLICY "roles_read_all"       ON public.roles FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "roles_admin_write"    ON public.roles FOR ALL USING (public.get_user_role() IN ('super_admin', 'admin'));

-- Departments
CREATE POLICY "departments_read_all"    ON public.departments FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "departments_admin_write" ON public.departments FOR ALL USING (public.get_user_role() IN ('super_admin', 'admin'));

-- Priorities
CREATE POLICY "priorities_read_all"    ON public.priorities FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "priorities_admin_write" ON public.priorities FOR ALL USING (public.get_user_role() IN ('super_admin', 'admin'));

-- Statuses
CREATE POLICY "statuses_read_all"    ON public.statuses FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "statuses_admin_write" ON public.statuses FOR ALL USING (public.get_user_role() IN ('super_admin', 'admin'));

-- Categories
CREATE POLICY "categories_read_all"    ON public.categories FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "categories_admin_write" ON public.categories FOR ALL USING (public.get_user_role() IN ('super_admin', 'admin'));

-- Ticket Types
CREATE POLICY "ticket_types_read_all"    ON public.ticket_types FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "ticket_types_admin_write" ON public.ticket_types FOR ALL USING (public.get_user_role() IN ('super_admin', 'admin'));

-- Queues
CREATE POLICY "queues_read_all"    ON public.queues FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "queues_admin_write" ON public.queues FOR ALL USING (public.get_user_role() IN ('super_admin', 'admin'));

-- Queue members
CREATE POLICY "queue_members_read_all"    ON public.queue_members FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "queue_members_admin_write" ON public.queue_members FOR ALL USING (public.get_user_role() IN ('super_admin', 'admin'));

-- Workflows
CREATE POLICY "workflows_read_all"         ON public.workflow_definitions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "workflows_superadmin_write" ON public.workflow_definitions FOR ALL USING (public.get_user_role() = 'super_admin');

-- Workflow transitions
CREATE POLICY "wf_transitions_read_all"         ON public.workflow_transitions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "wf_transitions_superadmin_write" ON public.workflow_transitions FOR ALL USING (public.get_user_role() = 'super_admin');

-- Approval rules
CREATE POLICY "approval_rules_read_all"    ON public.approval_rules FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "approval_rules_admin_write" ON public.approval_rules FOR ALL USING (public.get_user_role() IN ('super_admin', 'admin'));

-- Approval requests
CREATE POLICY "approval_requests_read"
  ON public.approval_requests FOR SELECT
  USING (
    requested_by = auth.uid()
    OR decided_by = auth.uid()
    OR public.get_user_role() IN ('super_admin', 'admin')
    OR auth.uid() = ANY(
      SELECT UNNEST(ar.approver_ids)
      FROM public.approval_rules ar WHERE ar.id = approval_rule_id
    )
  );

CREATE POLICY "approval_requests_insert"
  ON public.approval_requests FOR INSERT
  WITH CHECK (requested_by = auth.uid());

CREATE POLICY "approval_requests_update_approver"
  ON public.approval_requests FOR UPDATE
  USING (public.get_user_role() IN ('super_admin', 'admin') OR decided_by = auth.uid());

-- Business hours
CREATE POLICY "business_hours_read_all"    ON public.business_hours FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "business_hours_admin_write" ON public.business_hours FOR ALL USING (public.get_user_role() IN ('super_admin', 'admin'));

-- SLA policies
CREATE POLICY "sla_policies_read_all"    ON public.sla_policies FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "sla_policies_admin_write" ON public.sla_policies FOR ALL USING (public.get_user_role() IN ('super_admin', 'admin'));

-- SLA events
CREATE POLICY "sla_events_read"
  ON public.sla_events FOR SELECT
  USING (
    public.get_user_role() IN ('super_admin', 'admin', 'agent')
    OR EXISTS (
      SELECT 1 FROM public.tickets t WHERE t.id = ticket_id AND t.requester_id = auth.uid()
    )
  );

CREATE POLICY "sla_events_system_write" ON public.sla_events FOR ALL USING (true);

-- Escalation matrices
CREATE POLICY "escalation_matrices_read_all"    ON public.escalation_matrices FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "escalation_matrices_admin_write" ON public.escalation_matrices FOR ALL USING (public.get_user_role() IN ('super_admin', 'admin'));

-- Escalation rules
CREATE POLICY "escalation_rules_read_all"    ON public.escalation_rules FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "escalation_rules_admin_write" ON public.escalation_rules FOR ALL USING (public.get_user_role() IN ('super_admin', 'admin'));

-- Escalation logs
CREATE POLICY "escalation_logs_read_admin" ON public.escalation_logs FOR SELECT USING (public.get_user_role() IN ('super_admin', 'admin'));
CREATE POLICY "escalation_logs_system_write" ON public.escalation_logs FOR INSERT WITH CHECK (true);

-- Automation rules
CREATE POLICY "automation_rules_superadmin" ON public.automation_rules FOR ALL USING (public.get_user_role() = 'super_admin');

-- Automation logs
CREATE POLICY "automation_logs_superadmin_read" ON public.automation_logs FOR SELECT USING (public.get_user_role() = 'super_admin');
CREATE POLICY "automation_logs_system_write" ON public.automation_logs FOR INSERT WITH CHECK (true);

-- Webhook configs
CREATE POLICY "webhook_configs_superadmin" ON public.webhook_configs FOR ALL USING (public.get_user_role() = 'super_admin');

-- Notification templates
CREATE POLICY "notification_templates_read_all"    ON public.notification_templates FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "notification_templates_admin_write" ON public.notification_templates FOR ALL USING (public.get_user_role() IN ('super_admin', 'admin'));

-- Service catalog
CREATE POLICY "service_catalog_read_all"    ON public.service_catalog FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "service_catalog_admin_write" ON public.service_catalog FOR ALL USING (public.get_user_role() IN ('super_admin', 'admin'));

-- Custom fields
CREATE POLICY "custom_fields_read_all"    ON public.custom_fields FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "custom_fields_admin_write" ON public.custom_fields FOR ALL USING (public.get_user_role() IN ('super_admin', 'admin'));

-- Ticket links
CREATE POLICY "ticket_links_read"
  ON public.ticket_links FOR SELECT
  USING (public.get_user_role() IN ('super_admin', 'admin', 'agent') OR EXISTS (
    SELECT 1 FROM public.tickets t WHERE t.id = source_id AND t.requester_id = auth.uid()
  ));

CREATE POLICY "ticket_links_write_agent"
  ON public.ticket_links FOR ALL
  USING (public.get_user_role() IN ('super_admin', 'admin', 'agent'));

-- Ticket watchers
CREATE POLICY "ticket_watchers_read" ON public.ticket_watchers FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "ticket_watchers_write" ON public.ticket_watchers FOR ALL USING (auth.uid() IS NOT NULL);
