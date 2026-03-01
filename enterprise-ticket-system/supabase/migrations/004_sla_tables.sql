-- ============================================================
-- Migration 004: SLA Engine Tables
-- business_hours, sla_policies, escalation_matrices, sla_events
-- ============================================================

-- ============================================================
-- TABLE: business_hours
-- ============================================================
CREATE TABLE public.business_hours (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name      TEXT NOT NULL UNIQUE,
  timezone  TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  schedule  JSONB NOT NULL DEFAULT '{
    "monday":    {"is_working": true,  "start": "09:00", "end": "18:00"},
    "tuesday":   {"is_working": true,  "start": "09:00", "end": "18:00"},
    "wednesday": {"is_working": true,  "start": "09:00", "end": "18:00"},
    "thursday":  {"is_working": true,  "start": "09:00", "end": "18:00"},
    "friday":    {"is_working": true,  "start": "09:00", "end": "18:00"},
    "saturday":  {"is_working": false, "start": "09:00", "end": "13:00"},
    "sunday":    {"is_working": false, "start": "09:00", "end": "13:00"}
  }',
  holidays  DATE[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- ============================================================
-- TABLE: escalation_matrices
-- ============================================================
CREATE TABLE public.escalation_matrices (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- ============================================================
-- TABLE: escalation_rules
-- ============================================================
CREATE TABLE public.escalation_rules (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escalation_matrix_id     UUID NOT NULL REFERENCES public.escalation_matrices(id) ON DELETE CASCADE,
  level                    INT NOT NULL CHECK (level > 0),
  trigger_after_mins       INT NOT NULL CHECK (trigger_after_mins > 0),
  escalate_to_role         TEXT,
  escalate_to_user_id      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action                   TEXT NOT NULL CHECK (action IN ('notify','reassign','change_priority')),
  notification_template_id UUID,  -- FK added after notification_templates created
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by               UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by               UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  UNIQUE (escalation_matrix_id, level)
);

CREATE INDEX idx_escalation_rules_matrix_id ON public.escalation_rules(escalation_matrix_id);

-- ============================================================
-- TABLE: escalation_logs
-- ============================================================
CREATE TABLE public.escalation_logs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id           UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  escalation_rule_id  UUID REFERENCES public.escalation_rules(id) ON DELETE SET NULL,
  level               INT NOT NULL,
  action_taken        TEXT NOT NULL,
  escalated_to        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  triggered_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_escalation_logs_ticket_id ON public.escalation_logs(ticket_id);
CREATE INDEX idx_escalation_logs_triggered_at ON public.escalation_logs(triggered_at DESC);

-- ============================================================
-- TABLE: sla_policies
-- ============================================================
CREATE TABLE public.sla_policies (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL UNIQUE,
  description           TEXT,
  priority_id           UUID REFERENCES public.priorities(id) ON DELETE SET NULL,
  ticket_type_id        UUID REFERENCES public.ticket_types(id) ON DELETE SET NULL,
  response_time_hours   NUMERIC(8,2) NOT NULL CHECK (response_time_hours > 0),
  resolution_time_hours NUMERIC(8,2) NOT NULL CHECK (resolution_time_hours > 0),
  business_hours_id     UUID REFERENCES public.business_hours(id) ON DELETE SET NULL,
  escalation_matrix_id  UUID REFERENCES public.escalation_matrices(id) ON DELETE SET NULL,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by            UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by            UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_sla_policies_priority_id     ON public.sla_policies(priority_id);
CREATE INDEX idx_sla_policies_ticket_type_id  ON public.sla_policies(ticket_type_id);
CREATE INDEX idx_sla_policies_is_active       ON public.sla_policies(is_active);

-- ============================================================
-- TABLE: sla_events (tracks SLA per ticket)
-- ============================================================
CREATE TABLE public.sla_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id         UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  sla_policy_id     UUID NOT NULL REFERENCES public.sla_policies(id),
  event_type        TEXT NOT NULL CHECK (event_type IN ('response','resolution')),
  due_at            TIMESTAMPTZ NOT NULL,
  met_at            TIMESTAMPTZ,
  is_breached       BOOLEAN NOT NULL DEFAULT FALSE,
  breached_at       TIMESTAMPTZ,
  paused_at         TIMESTAMPTZ,
  pause_reason      TEXT,
  total_pause_mins  INT NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sla_events_ticket_id   ON public.sla_events(ticket_id);
CREATE INDEX idx_sla_events_due_at      ON public.sla_events(due_at);
CREATE INDEX idx_sla_events_is_breached ON public.sla_events(is_breached);
CREATE INDEX idx_sla_events_event_type  ON public.sla_events(event_type);

-- Add FK from tickets to sla_policies (now that sla_policies exists)
ALTER TABLE public.tickets
  ADD CONSTRAINT fk_tickets_sla_policy
  FOREIGN KEY (sla_policy_id) REFERENCES public.sla_policies(id) ON DELETE SET NULL;
