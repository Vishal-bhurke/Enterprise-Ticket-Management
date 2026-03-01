-- ============================================================
-- Migration 003: Workflow Engine Tables
-- workflow_definitions, workflow_transitions, approval_rules, approval_requests
-- ============================================================

-- ============================================================
-- TABLE: approval_rules
-- ============================================================
CREATE TABLE public.approval_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL UNIQUE,
  description     TEXT,
  approval_type   TEXT NOT NULL CHECK (approval_type IN ('sequential','parallel','any_one')),
  approver_roles  TEXT[] NOT NULL DEFAULT '{}',
  approver_ids    UUID[] NOT NULL DEFAULT '{}',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_approval_rules_is_active ON public.approval_rules(is_active);

-- ============================================================
-- TABLE: workflow_definitions
-- ============================================================
CREATE TABLE public.workflow_definitions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  description TEXT,
  is_default  BOOLEAN NOT NULL DEFAULT FALSE,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_workflow_definitions_is_default ON public.workflow_definitions(is_default);

-- ============================================================
-- TABLE: workflow_transitions (state machine edges)
-- ============================================================
CREATE TABLE public.workflow_transitions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id         UUID NOT NULL REFERENCES public.workflow_definitions(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  from_status_id      UUID REFERENCES public.statuses(id) ON DELETE CASCADE,
  to_status_id        UUID NOT NULL REFERENCES public.statuses(id) ON DELETE CASCADE,
  allowed_roles       TEXT[] NOT NULL DEFAULT '{}',
  requires_approval   BOOLEAN NOT NULL DEFAULT FALSE,
  approval_rule_id    UUID REFERENCES public.approval_rules(id) ON DELETE SET NULL,
  conditions          JSONB NOT NULL DEFAULT '[]',
  sort_order          INT NOT NULL DEFAULT 0,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by          UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by          UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_wf_transitions_workflow_id  ON public.workflow_transitions(workflow_id);
CREATE INDEX idx_wf_transitions_from_status  ON public.workflow_transitions(from_status_id);
CREATE INDEX idx_wf_transitions_to_status    ON public.workflow_transitions(to_status_id);
CREATE INDEX idx_wf_transitions_is_active    ON public.workflow_transitions(is_active);

-- ============================================================
-- TABLE: approval_requests
-- ============================================================
CREATE TABLE public.approval_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id         UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  transition_id     UUID NOT NULL REFERENCES public.workflow_transitions(id),
  approval_rule_id  UUID NOT NULL REFERENCES public.approval_rules(id),
  requested_by      UUID NOT NULL REFERENCES public.profiles(id),
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
  decided_by        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  decision_at       TIMESTAMPTZ,
  comments          TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_approval_requests_ticket_id ON public.approval_requests(ticket_id);
CREATE INDEX idx_approval_requests_status    ON public.approval_requests(status);
CREATE INDEX idx_approval_requests_requested_by ON public.approval_requests(requested_by);

-- ============================================================
-- Add FK from ticket_types to workflow_definitions (now that wf table exists)
-- ============================================================
ALTER TABLE public.ticket_types
  ADD CONSTRAINT fk_ticket_types_workflow
  FOREIGN KEY (default_workflow_id) REFERENCES public.workflow_definitions(id) ON DELETE SET NULL;
