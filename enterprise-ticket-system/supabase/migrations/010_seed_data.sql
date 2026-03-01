-- ============================================================
-- Migration 010: Seed Data
-- Default roles, priorities, statuses, business hours, SLA policies,
-- workflow, and a super_admin user setup
-- ============================================================

-- ============================================================
-- SEED: Roles
-- ============================================================
INSERT INTO public.roles (name, slug, description, is_system, is_active, permissions) VALUES
  ('Super Admin', 'super_admin', 'Full system access with all configuration rights', TRUE, TRUE, '{
    "tickets": {"create": true, "read": true, "update": true, "delete": true, "assign": true},
    "masters": {"create": true, "read": true, "update": true, "delete": true},
    "workflow": {"manage": true},
    "sla": {"manage": true},
    "automation": {"manage": true},
    "reports": {"read": true},
    "audit": {"read": true},
    "integrations": {"manage": true},
    "users": {"create": true, "read": true, "update": true, "delete": true}
  }'),
  ('Admin', 'admin', 'Manages tickets, users and masters, views reports', TRUE, TRUE, '{
    "tickets": {"create": true, "read": true, "update": true, "delete": true, "assign": true},
    "masters": {"create": true, "read": true, "update": true, "delete": true},
    "workflow": {"manage": false},
    "sla": {"manage": false},
    "automation": {"manage": false},
    "reports": {"read": true},
    "audit": {"read": true},
    "integrations": {"manage": false},
    "users": {"create": true, "read": true, "update": true, "delete": false}
  }'),
  ('Agent', 'agent', 'Handles assigned tickets, updates status and adds comments', TRUE, TRUE, '{
    "tickets": {"create": true, "read": true, "update": true, "delete": false, "assign": false},
    "masters": {"create": false, "read": true, "update": false, "delete": false},
    "reports": {"read": false},
    "audit": {"read": false}
  }'),
  ('End User', 'end_user', 'Creates and tracks their own tickets', TRUE, TRUE, '{
    "tickets": {"create": true, "read": true, "update": false, "delete": false, "assign": false},
    "masters": {"create": false, "read": false, "update": false, "delete": false}
  }');

-- ============================================================
-- SEED: Priorities (level 1=Critical to 4=Low)
-- ============================================================
INSERT INTO public.priorities (name, slug, level, color, icon, sla_multiplier) VALUES
  ('Critical', 'critical', 1, '#DC2626', 'pi pi-exclamation-circle', 0.5),
  ('High',     'high',     2, '#EA580C', 'pi pi-arrow-up',           0.75),
  ('Medium',   'medium',   3, '#D97706', 'pi pi-minus',              1.0),
  ('Low',      'low',      4, '#16A34A', 'pi pi-arrow-down',         1.5);

-- ============================================================
-- SEED: Statuses
-- ============================================================
INSERT INTO public.statuses (name, slug, category, color, is_default, is_closed, sort_order) VALUES
  ('Open',        'open',        'open',        '#3B82F6', TRUE,  FALSE, 1),
  ('In Progress', 'in_progress', 'in_progress', '#8B5CF6', FALSE, FALSE, 2),
  ('Pending',     'pending',     'pending',     '#F59E0B', FALSE, FALSE, 3),
  ('On Hold',     'on_hold',     'pending',     '#6B7280', FALSE, FALSE, 4),
  ('Resolved',    'resolved',    'resolved',    '#10B981', FALSE, FALSE, 5),
  ('Closed',      'closed',      'closed',      '#64748B', FALSE, TRUE,  6),
  ('Cancelled',   'cancelled',   'closed',      '#EF4444', FALSE, TRUE,  7);

-- ============================================================
-- SEED: Departments
-- ============================================================
INSERT INTO public.departments (name, code, description) VALUES
  ('Information Technology', 'IT', 'IT infrastructure, systems, and software support'),
  ('Human Resources',        'HR', 'Employee relations, payroll, and benefits'),
  ('Finance',                'FIN', 'Accounting, budgeting, and financial operations'),
  ('Operations',             'OPS', 'Business operations and process management'),
  ('Customer Success',       'CS', 'Customer support and success management');

-- ============================================================
-- SEED: Categories
-- ============================================================
INSERT INTO public.categories (name, code, description) VALUES
  ('Hardware',         'HW',    'Physical hardware issues and requests'),
  ('Software',         'SW',    'Software installation, bugs, and access'),
  ('Network',          'NET',   'Network connectivity and infrastructure'),
  ('Access & Security','SEC',   'User access, passwords, and security'),
  ('Email',            'EMAIL', 'Email accounts and issues'),
  ('HR Request',       'HR',    'HR-related requests and queries'),
  ('Finance Request',  'FIN',   'Finance and billing requests'),
  ('General Inquiry',  'GEN',   'General questions and information requests');

-- ============================================================
-- SEED: Ticket Types
-- ============================================================
INSERT INTO public.ticket_types (name, slug, description, icon) VALUES
  ('Incident',       'incident',       'Unplanned interruption or degradation of service', 'pi pi-exclamation-triangle'),
  ('Service Request','service_request','Standard request for a service or information',     'pi pi-inbox'),
  ('Problem',        'problem',        'Root cause investigation for recurring incidents',  'pi pi-search'),
  ('Change Request', 'change_request', 'Planned change to services or infrastructure',     'pi pi-sync'),
  ('Task',           'task',           'Internal task or work item',                       'pi pi-check-square');

-- ============================================================
-- SEED: Queues
-- ============================================================
INSERT INTO public.queues (name, description) VALUES
  ('IT Support',        'General IT support and helpdesk'),
  ('Network Team',      'Network infrastructure issues'),
  ('Security Team',     'Security incidents and access management'),
  ('HR Team',           'Human resources requests'),
  ('Finance Team',      'Finance and billing queries');

-- ============================================================
-- SEED: Business Hours (Standard 9-6 Mon-Fri IST)
-- ============================================================
INSERT INTO public.business_hours (name, timezone, schedule) VALUES
  ('Standard Business Hours', 'Asia/Kolkata', '{
    "monday":    {"is_working": true,  "start": "09:00", "end": "18:00"},
    "tuesday":   {"is_working": true,  "start": "09:00", "end": "18:00"},
    "wednesday": {"is_working": true,  "start": "09:00", "end": "18:00"},
    "thursday":  {"is_working": true,  "start": "09:00", "end": "18:00"},
    "friday":    {"is_working": true,  "start": "09:00", "end": "18:00"},
    "saturday":  {"is_working": false, "start": "09:00", "end": "13:00"},
    "sunday":    {"is_working": false, "start": "09:00", "end": "13:00"}
  }'),
  ('24x7 Support', 'UTC', '{
    "monday":    {"is_working": true, "start": "00:00", "end": "23:59"},
    "tuesday":   {"is_working": true, "start": "00:00", "end": "23:59"},
    "wednesday": {"is_working": true, "start": "00:00", "end": "23:59"},
    "thursday":  {"is_working": true, "start": "00:00", "end": "23:59"},
    "friday":    {"is_working": true, "start": "00:00", "end": "23:59"},
    "saturday":  {"is_working": true, "start": "00:00", "end": "23:59"},
    "sunday":    {"is_working": true, "start": "00:00", "end": "23:59"}
  }');

-- ============================================================
-- SEED: Escalation Matrix
-- ============================================================
INSERT INTO public.escalation_matrices (name, description) VALUES
  ('Standard Escalation', 'Default escalation matrix for all tickets'),
  ('Critical Escalation', 'Fast-track escalation for critical priority tickets');

-- ============================================================
-- SEED: SLA Policies
-- ============================================================
WITH
  bh AS (SELECT id FROM public.business_hours WHERE name = 'Standard Business Hours' LIMIT 1),
  bh24 AS (SELECT id FROM public.business_hours WHERE name = '24x7 Support' LIMIT 1),
  p_critical AS (SELECT id FROM public.priorities WHERE slug = 'critical' LIMIT 1),
  p_high AS (SELECT id FROM public.priorities WHERE slug = 'high' LIMIT 1),
  p_medium AS (SELECT id FROM public.priorities WHERE slug = 'medium' LIMIT 1),
  p_low AS (SELECT id FROM public.priorities WHERE slug = 'low' LIMIT 1),
  em_crit AS (SELECT id FROM public.escalation_matrices WHERE name = 'Critical Escalation' LIMIT 1),
  em_std AS (SELECT id FROM public.escalation_matrices WHERE name = 'Standard Escalation' LIMIT 1)
INSERT INTO public.sla_policies (name, description, priority_id, response_time_hours, resolution_time_hours, business_hours_id, escalation_matrix_id) VALUES
  ('Critical SLA',  'For critical priority tickets - 1h response, 4h resolution',   (SELECT id FROM p_critical),  1.0,  4.0,  (SELECT id FROM bh24),  (SELECT id FROM em_crit)),
  ('High SLA',      'For high priority tickets - 2h response, 8h resolution',        (SELECT id FROM p_high),      2.0,  8.0,  (SELECT id FROM bh),    (SELECT id FROM em_std)),
  ('Medium SLA',    'For medium priority tickets - 4h response, 24h resolution',     (SELECT id FROM p_medium),    4.0,  24.0, (SELECT id FROM bh),    (SELECT id FROM em_std)),
  ('Low SLA',       'For low priority tickets - 8h response, 72h resolution',        (SELECT id FROM p_low),       8.0,  72.0, (SELECT id FROM bh),    (SELECT id FROM em_std));

-- ============================================================
-- SEED: Default Workflow Definition
-- ============================================================
INSERT INTO public.workflow_definitions (name, description, is_default) VALUES
  ('Standard IT Workflow', 'Default workflow for IT service management tickets', TRUE);

-- ============================================================
-- SEED: Workflow Transitions (state machine)
-- ============================================================
WITH wfid AS (SELECT id FROM public.workflow_definitions WHERE name = 'Standard IT Workflow' LIMIT 1),
  s_open AS (SELECT id FROM public.statuses WHERE slug = 'open' LIMIT 1),
  s_inprog AS (SELECT id FROM public.statuses WHERE slug = 'in_progress' LIMIT 1),
  s_pending AS (SELECT id FROM public.statuses WHERE slug = 'pending' LIMIT 1),
  s_resolved AS (SELECT id FROM public.statuses WHERE slug = 'resolved' LIMIT 1),
  s_closed AS (SELECT id FROM public.statuses WHERE slug = 'closed' LIMIT 1),
  s_cancelled AS (SELECT id FROM public.statuses WHERE slug = 'cancelled' LIMIT 1)
INSERT INTO public.workflow_transitions (workflow_id, name, from_status_id, to_status_id, allowed_roles, sort_order) VALUES
  -- From Open
  ((SELECT id FROM wfid), 'Start Working',   (SELECT id FROM s_open),     (SELECT id FROM s_inprog),   '{"agent","admin","super_admin"}', 1),
  ((SELECT id FROM wfid), 'Put On Hold',      (SELECT id FROM s_open),     (SELECT id FROM s_pending),  '{"agent","admin","super_admin"}', 2),
  ((SELECT id FROM wfid), 'Cancel Ticket',    (SELECT id FROM s_open),     (SELECT id FROM s_cancelled),'{"admin","super_admin"}', 3),
  -- From In Progress
  ((SELECT id FROM wfid), 'Need More Info',   (SELECT id FROM s_inprog),   (SELECT id FROM s_pending),  '{"agent","admin","super_admin"}', 4),
  ((SELECT id FROM wfid), 'Resolve',          (SELECT id FROM s_inprog),   (SELECT id FROM s_resolved), '{"agent","admin","super_admin"}', 5),
  -- From Pending
  ((SELECT id FROM wfid), 'Resume Work',      (SELECT id FROM s_pending),  (SELECT id FROM s_inprog),   '{"agent","admin","super_admin"}', 6),
  ((SELECT id FROM wfid), 'Resolve Pending',  (SELECT id FROM s_pending),  (SELECT id FROM s_resolved), '{"agent","admin","super_admin"}', 7),
  -- From Resolved
  ((SELECT id FROM wfid), 'Close Ticket',     (SELECT id FROM s_resolved), (SELECT id FROM s_closed),   '{"agent","admin","super_admin","end_user"}', 8),
  ((SELECT id FROM wfid), 'Reopen',           (SELECT id FROM s_resolved), (SELECT id FROM s_open),     '{"end_user","admin","super_admin"}', 9),
  -- From Closed
  ((SELECT id FROM wfid), 'Reopen Closed',    (SELECT id FROM s_closed),   (SELECT id FROM s_open),     '{"admin","super_admin"}', 10);

-- ============================================================
-- SEED: Notification Templates
-- ============================================================
INSERT INTO public.notification_templates (name, slug, channel, subject, body, variables, is_system) VALUES
  ('Ticket Created',      'ticket_created',      'both', 'Ticket {{ticket_number}} Created',
   'A new ticket {{ticket_number}} has been created: {{ticket_title}}. Priority: {{priority}}.',
   '{"ticket_number","ticket_title","priority","requester_name"}', TRUE),

  ('Ticket Assigned',     'ticket_assigned',     'both', 'Ticket {{ticket_number}} Assigned to You',
   'Ticket {{ticket_number}} ({{ticket_title}}) has been assigned to you. Priority: {{priority}}.',
   '{"ticket_number","ticket_title","priority","assignee_name"}', TRUE),

  ('Ticket Status Changed','ticket_status_changed','both', 'Ticket {{ticket_number}} Status Updated',
   'The status of ticket {{ticket_number}} has changed from {{old_status}} to {{new_status}}.',
   '{"ticket_number","ticket_title","old_status","new_status"}', TRUE),

  ('SLA Breach Warning',  'sla_breach_warning',  'both', 'SLA Warning: Ticket {{ticket_number}}',
   'ALERT: Ticket {{ticket_number}} ({{ticket_title}}) is approaching SLA breach. Due in {{time_remaining}}.',
   '{"ticket_number","ticket_title","time_remaining","sla_type"}', TRUE),

  ('SLA Breached',        'sla_breached',        'both', 'SLA Breached: Ticket {{ticket_number}}',
   'SLA BREACHED: Ticket {{ticket_number}} ({{ticket_title}}) has exceeded the {{sla_type}} SLA by {{overdue_by}}.',
   '{"ticket_number","ticket_title","sla_type","overdue_by"}', TRUE),

  ('Ticket Resolved',     'ticket_resolved',     'both', 'Ticket {{ticket_number}} Has Been Resolved',
   'Your ticket {{ticket_number}} ({{ticket_title}}) has been resolved. Please review and close if satisfied.',
   '{"ticket_number","ticket_title","resolved_by"}', TRUE),

  ('Comment Added',       'comment_added',       'in_app', NULL,
   'New comment on ticket {{ticket_number}} by {{author_name}}: {{comment_preview}}',
   '{"ticket_number","author_name","comment_preview"}', TRUE),

  ('Mentioned in Comment','mention_notification', 'in_app', NULL,
   '{{author_name}} mentioned you in a comment on ticket {{ticket_number}}: {{comment_preview}}',
   '{"ticket_number","author_name","comment_preview"}', TRUE);

-- ============================================================
-- SEED: Escalation Rules for Standard Escalation
-- ============================================================
WITH em AS (SELECT id FROM public.escalation_matrices WHERE name = 'Standard Escalation' LIMIT 1),
     t_sla_breach AS (SELECT id FROM public.notification_templates WHERE slug = 'sla_breached' LIMIT 1)
INSERT INTO public.escalation_rules (escalation_matrix_id, level, trigger_after_mins, escalate_to_role, action, notification_template_id) VALUES
  ((SELECT id FROM em), 1, 30,  'admin',       'notify',   (SELECT id FROM t_sla_breach)),
  ((SELECT id FROM em), 2, 60,  'super_admin',  'reassign', (SELECT id FROM t_sla_breach)),
  ((SELECT id FROM em), 3, 120, 'super_admin',  'notify',   (SELECT id FROM t_sla_breach));

-- For Critical Escalation - faster timers
WITH em AS (SELECT id FROM public.escalation_matrices WHERE name = 'Critical Escalation' LIMIT 1),
     t_sla_breach AS (SELECT id FROM public.notification_templates WHERE slug = 'sla_breached' LIMIT 1)
INSERT INTO public.escalation_rules (escalation_matrix_id, level, trigger_after_mins, escalate_to_role, action, notification_template_id) VALUES
  ((SELECT id FROM em), 1, 15,  'admin',       'notify',   (SELECT id FROM t_sla_breach)),
  ((SELECT id FROM em), 2, 30,  'super_admin',  'reassign', (SELECT id FROM t_sla_breach)),
  ((SELECT id FROM em), 3, 60,  'super_admin',  'notify',   (SELECT id FROM t_sla_breach));
