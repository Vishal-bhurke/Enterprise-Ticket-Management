-- ============================================================
-- Migration 007: Audit and Misc Tables
-- audit_logs, api_keys, ticket_watchers
-- ============================================================

-- ============================================================
-- TABLE: audit_logs
-- ============================================================
CREATE TABLE public.audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id   UUID NOT NULL,
  action      TEXT NOT NULL,
  actor_id    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_ip    TEXT,
  old_values  JSONB NOT NULL DEFAULT '{}',
  new_values  JSONB NOT NULL DEFAULT '{}',
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_entity_type  ON public.audit_logs(entity_type);
CREATE INDEX idx_audit_logs_entity_id    ON public.audit_logs(entity_id);
CREATE INDEX idx_audit_logs_actor_id     ON public.audit_logs(actor_id);
CREATE INDEX idx_audit_logs_created_at   ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action       ON public.audit_logs(action);

-- Composite for timeline queries
CREATE INDEX idx_audit_logs_entity_timeline ON public.audit_logs(entity_type, entity_id, created_at DESC);

-- ============================================================
-- TABLE: api_keys
-- ============================================================
CREATE TABLE public.api_keys (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  key_hash    TEXT NOT NULL UNIQUE,
  key_prefix  TEXT NOT NULL,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  permissions TEXT[] NOT NULL DEFAULT '{}',
  last_used   TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_api_keys_user_id   ON public.api_keys(user_id);
CREATE INDEX idx_api_keys_key_hash  ON public.api_keys(key_hash);
CREATE INDEX idx_api_keys_is_active ON public.api_keys(is_active);

-- ============================================================
-- TABLE: ticket_watchers (users following a ticket)
-- ============================================================
CREATE TABLE public.ticket_watchers (
  ticket_id  UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  added_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (ticket_id, user_id)
);

CREATE INDEX idx_ticket_watchers_user_id ON public.ticket_watchers(user_id);
