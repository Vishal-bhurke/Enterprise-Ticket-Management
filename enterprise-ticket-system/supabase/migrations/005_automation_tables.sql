-- ============================================================
-- Migration 005: Automation Engine Tables
-- automation_rules, automation_logs, webhook_configs
-- ============================================================

-- ============================================================
-- TABLE: automation_rules
-- ============================================================
CREATE TABLE public.automation_rules (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  description    TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  trigger_event  TEXT NOT NULL CHECK (trigger_event IN (
    'ticket_created','ticket_updated','ticket_assigned','ticket_resolved',
    'ticket_closed','comment_added','sla_breached','status_changed',
    'priority_changed','scheduled'
  )),
  trigger_config JSONB NOT NULL DEFAULT '{}',
  conditions     JSONB NOT NULL DEFAULT '[]',
  actions        JSONB NOT NULL DEFAULT '[]',
  run_order      INT NOT NULL DEFAULT 0,
  stop_on_match  BOOLEAN NOT NULL DEFAULT FALSE,
  last_triggered TIMESTAMPTZ,
  trigger_count  BIGINT NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by     UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_automation_rules_trigger_event ON public.automation_rules(trigger_event);
CREATE INDEX idx_automation_rules_is_active     ON public.automation_rules(is_active);
CREATE INDEX idx_automation_rules_run_order     ON public.automation_rules(run_order);

-- ============================================================
-- TABLE: automation_logs
-- ============================================================
CREATE TABLE public.automation_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id        UUID NOT NULL REFERENCES public.automation_rules(id) ON DELETE CASCADE,
  ticket_id      UUID REFERENCES public.tickets(id) ON DELETE SET NULL,
  triggered_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status         TEXT NOT NULL CHECK (status IN ('success','failed','skipped')),
  actions_taken  JSONB NOT NULL DEFAULT '[]',
  error_message  TEXT
);

CREATE INDEX idx_automation_logs_rule_id    ON public.automation_logs(rule_id);
CREATE INDEX idx_automation_logs_ticket_id  ON public.automation_logs(ticket_id);
CREATE INDEX idx_automation_logs_triggered  ON public.automation_logs(triggered_at DESC);
CREATE INDEX idx_automation_logs_status     ON public.automation_logs(status);

-- ============================================================
-- TABLE: webhook_configs
-- ============================================================
CREATE TABLE public.webhook_configs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  url            TEXT NOT NULL,
  secret         TEXT,
  events         TEXT[] NOT NULL DEFAULT '{}',
  headers        JSONB NOT NULL DEFAULT '{}',
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  last_triggered TIMESTAMPTZ,
  failure_count  INT NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by     UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_webhook_configs_is_active ON public.webhook_configs(is_active);
