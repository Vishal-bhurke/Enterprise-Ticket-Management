-- ============================================================
-- Migration 002: Ticket Domain Tables
-- ticket_types, categories, priorities, statuses, queues, tickets
-- ============================================================

-- ============================================================
-- TABLE: priorities
-- ============================================================
CREATE TABLE public.priorities (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL UNIQUE,
  slug           TEXT NOT NULL UNIQUE,
  level          INT NOT NULL CHECK (level BETWEEN 1 AND 4),
  color          TEXT NOT NULL DEFAULT '#64748B',
  icon           TEXT,
  sla_multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.0,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by     UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_priorities_level ON public.priorities(level);
CREATE INDEX idx_priorities_slug ON public.priorities(slug);

-- ============================================================
-- TABLE: statuses
-- ============================================================
CREATE TABLE public.statuses (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,
  slug       TEXT NOT NULL UNIQUE,
  category   TEXT NOT NULL CHECK (category IN ('open','in_progress','pending','resolved','closed')),
  color      TEXT NOT NULL DEFAULT '#64748B',
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  is_closed  BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INT NOT NULL DEFAULT 0,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_statuses_category ON public.statuses(category);
CREATE INDEX idx_statuses_slug ON public.statuses(slug);
CREATE INDEX idx_statuses_sort_order ON public.statuses(sort_order);

-- ============================================================
-- TABLE: categories
-- ============================================================
CREATE TABLE public.categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  code        TEXT NOT NULL UNIQUE,
  description TEXT,
  parent_id   UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_categories_code ON public.categories(code);
CREATE INDEX idx_categories_parent_id ON public.categories(parent_id);
CREATE INDEX idx_categories_is_active ON public.categories(is_active);

-- ============================================================
-- TABLE: ticket_types
-- ============================================================
CREATE TABLE public.ticket_types (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 TEXT NOT NULL UNIQUE,
  slug                 TEXT NOT NULL UNIQUE,
  description          TEXT,
  icon                 TEXT DEFAULT 'pi pi-ticket',
  default_priority_id  UUID REFERENCES public.priorities(id) ON DELETE SET NULL,
  default_workflow_id  UUID,  -- FK added later after workflow table created
  custom_field_schema  JSONB NOT NULL DEFAULT '[]',
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by           UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by           UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_ticket_types_slug ON public.ticket_types(slug);
CREATE INDEX idx_ticket_types_is_active ON public.ticket_types(is_active);

-- ============================================================
-- TABLE: queues
-- ============================================================
CREATE TABLE public.queues (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL UNIQUE,
  description   TEXT,
  team_lead_id  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by    UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_queues_is_active ON public.queues(is_active);

-- ============================================================
-- TABLE: queue_members (junction: agents in queues)
-- ============================================================
CREATE TABLE public.queue_members (
  queue_id   UUID NOT NULL REFERENCES public.queues(id) ON DELETE CASCADE,
  agent_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (queue_id, agent_id)
);

CREATE INDEX idx_queue_members_agent_id ON public.queue_members(agent_id);

-- ============================================================
-- TABLE: tickets (central entity)
-- ============================================================
CREATE TABLE public.tickets (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number     TEXT NOT NULL UNIQUE,
  title             TEXT NOT NULL,
  description       TEXT,
  ticket_type_id    UUID NOT NULL REFERENCES public.ticket_types(id),
  status_id         UUID NOT NULL REFERENCES public.statuses(id),
  priority_id       UUID NOT NULL REFERENCES public.priorities(id),
  category_id       UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  department_id     UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  queue_id          UUID REFERENCES public.queues(id) ON DELETE SET NULL,
  requester_id      UUID NOT NULL REFERENCES public.profiles(id),
  assignee_id       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  parent_ticket_id  UUID REFERENCES public.tickets(id) ON DELETE SET NULL,
  due_date          TIMESTAMPTZ,
  resolved_at       TIMESTAMPTZ,
  closed_at         TIMESTAMPTZ,
  custom_fields     JSONB NOT NULL DEFAULT '{}',
  tags              TEXT[] NOT NULL DEFAULT '{}',
  source            TEXT NOT NULL DEFAULT 'web' CHECK (source IN ('web','email','api','phone')),
  is_escalated      BOOLEAN NOT NULL DEFAULT FALSE,
  escalated_at      TIMESTAMPTZ,
  sla_policy_id     UUID,  -- FK added later
  sla_response_due  TIMESTAMPTZ,
  sla_resolve_due   TIMESTAMPTZ,
  sla_response_met  BOOLEAN,
  sla_resolve_met   BOOLEAN,
  first_response_at TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID NOT NULL REFERENCES public.profiles(id),
  updated_by        UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Performance indexes on tickets
CREATE INDEX idx_tickets_ticket_number    ON public.tickets(ticket_number);
CREATE INDEX idx_tickets_status_id        ON public.tickets(status_id);
CREATE INDEX idx_tickets_priority_id      ON public.tickets(priority_id);
CREATE INDEX idx_tickets_category_id      ON public.tickets(category_id);
CREATE INDEX idx_tickets_department_id    ON public.tickets(department_id);
CREATE INDEX idx_tickets_queue_id         ON public.tickets(queue_id);
CREATE INDEX idx_tickets_requester_id     ON public.tickets(requester_id);
CREATE INDEX idx_tickets_assignee_id      ON public.tickets(assignee_id);
CREATE INDEX idx_tickets_created_at       ON public.tickets(created_at DESC);
CREATE INDEX idx_tickets_sla_resolve_due  ON public.tickets(sla_resolve_due);
CREATE INDEX idx_tickets_is_escalated     ON public.tickets(is_escalated);
CREATE INDEX idx_tickets_parent_id        ON public.tickets(parent_ticket_id);
CREATE INDEX idx_tickets_tags             ON public.tickets USING GIN(tags);

-- Full-text search index
CREATE INDEX idx_tickets_fts ON public.tickets
  USING GIN(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- ============================================================
-- TABLE: ticket_links
-- ============================================================
CREATE TABLE public.ticket_links (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id   UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  target_id   UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  link_type   TEXT NOT NULL CHECK (link_type IN ('relates_to','blocks','is_blocked_by','duplicates','is_duplicated_by','parent_of','child_of')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  UNIQUE (source_id, target_id, link_type)
);

CREATE INDEX idx_ticket_links_source ON public.ticket_links(source_id);
CREATE INDEX idx_ticket_links_target ON public.ticket_links(target_id);

-- ============================================================
-- TABLE: ticket_comments
-- ============================================================
CREATE TABLE public.ticket_comments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id    UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  author_id    UUID NOT NULL REFERENCES public.profiles(id),
  body         TEXT NOT NULL,
  is_internal  BOOLEAN NOT NULL DEFAULT FALSE,
  mentions     UUID[] NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_comments_ticket_id  ON public.ticket_comments(ticket_id);
CREATE INDEX idx_comments_author_id  ON public.ticket_comments(author_id);
CREATE INDEX idx_comments_created_at ON public.ticket_comments(created_at DESC);

-- ============================================================
-- TABLE: ticket_attachments
-- ============================================================
CREATE TABLE public.ticket_attachments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id    UUID REFERENCES public.tickets(id) ON DELETE CASCADE,
  comment_id   UUID REFERENCES public.ticket_comments(id) ON DELETE CASCADE,
  file_name    TEXT NOT NULL,
  file_size    BIGINT NOT NULL CHECK (file_size > 0),
  mime_type    TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  uploaded_by  UUID NOT NULL REFERENCES public.profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_attachments_ticket_id  ON public.ticket_attachments(ticket_id);
CREATE INDEX idx_attachments_comment_id ON public.ticket_attachments(comment_id);
