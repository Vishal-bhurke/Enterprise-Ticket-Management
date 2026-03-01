-- ============================================================
-- Migration 006: Notification Tables
-- notification_templates, notifications
-- ============================================================

-- ============================================================
-- TABLE: notification_templates
-- ============================================================
CREATE TABLE public.notification_templates (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name      TEXT NOT NULL UNIQUE,
  slug      TEXT NOT NULL UNIQUE,
  channel   TEXT NOT NULL CHECK (channel IN ('email','in_app','both')),
  subject   TEXT,
  body      TEXT NOT NULL,
  variables TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_notification_templates_slug ON public.notification_templates(slug);
CREATE INDEX idx_notification_templates_active ON public.notification_templates(is_active);

-- Now add FK from escalation_rules to notification_templates
ALTER TABLE public.escalation_rules
  ADD CONSTRAINT fk_escalation_rules_template
  FOREIGN KEY (notification_template_id) REFERENCES public.notification_templates(id) ON DELETE SET NULL;

-- ============================================================
-- TABLE: notifications (in-app)
-- ============================================================
CREATE TABLE public.notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  type       TEXT NOT NULL CHECK (type IN (
    'ticket_update','assignment','sla_breach','mention','system','escalation','approval'
  )),
  ticket_id  UUID REFERENCES public.tickets(id) ON DELETE SET NULL,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id    ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read    ON public.notifications(user_id, is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_ticket_id  ON public.notifications(ticket_id);

-- ============================================================
-- TABLE: service_catalog
-- ============================================================
CREATE TABLE public.service_catalog (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 TEXT NOT NULL UNIQUE,
  description          TEXT,
  category_id          UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  default_ticket_type  UUID REFERENCES public.ticket_types(id) ON DELETE SET NULL,
  default_priority_id  UUID REFERENCES public.priorities(id) ON DELETE SET NULL,
  default_sla_id       UUID REFERENCES public.sla_policies(id) ON DELETE SET NULL,
  icon                 TEXT DEFAULT 'pi pi-box',
  form_schema          JSONB NOT NULL DEFAULT '[]',
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by           UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by           UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_service_catalog_category_id ON public.service_catalog(category_id);
CREATE INDEX idx_service_catalog_is_active   ON public.service_catalog(is_active);

-- ============================================================
-- TABLE: custom_fields
-- ============================================================
CREATE TABLE public.custom_fields (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  key         TEXT NOT NULL UNIQUE,
  field_type  TEXT NOT NULL CHECK (field_type IN (
    'text','number','date','datetime','boolean','select','multi_select','user'
  )),
  options     JSONB NOT NULL DEFAULT '[]',
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  applies_to  TEXT[] NOT NULL DEFAULT '{}',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_custom_fields_key       ON public.custom_fields(key);
CREATE INDEX idx_custom_fields_is_active ON public.custom_fields(is_active);
