-- ============================================================
-- Migration 001: Core Identity Tables
-- Roles, Profiles, Departments
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLE: roles
-- ============================================================
CREATE TABLE public.roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '{}',
  is_system   BOOLEAN NOT NULL DEFAULT FALSE,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID,
  updated_by  UUID
);

CREATE INDEX idx_roles_slug ON public.roles(slug);
CREATE INDEX idx_roles_is_active ON public.roles(is_active);

-- ============================================================
-- TABLE: departments
-- ============================================================
CREATE TABLE public.departments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  code        TEXT NOT NULL UNIQUE,
  description TEXT,
  head_id     UUID,
  parent_id   UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID,
  updated_by  UUID
);

CREATE INDEX idx_departments_code ON public.departments(code);
CREATE INDEX idx_departments_parent_id ON public.departments(parent_id);
CREATE INDEX idx_departments_is_active ON public.departments(is_active);

-- ============================================================
-- TABLE: profiles (extends auth.users)
-- ============================================================
CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id   TEXT UNIQUE,
  full_name     TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  phone         TEXT,
  avatar_url    TEXT,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  role_id       UUID NOT NULL REFERENCES public.roles(id),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  timezone      TEXT NOT NULL DEFAULT 'UTC',
  preferences   JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by    UUID,
  updated_by    UUID
);

CREATE INDEX idx_profiles_role_id ON public.profiles(role_id);
CREATE INDEX idx_profiles_department_id ON public.profiles(department_id);
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_is_active ON public.profiles(is_active);
CREATE INDEX idx_profiles_employee_id ON public.profiles(employee_id);

-- Now add foreign keys back that depend on profiles
ALTER TABLE public.roles ADD CONSTRAINT fk_roles_created_by FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.roles ADD CONSTRAINT fk_roles_updated_by FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.departments ADD CONSTRAINT fk_departments_head FOREIGN KEY (head_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.departments ADD CONSTRAINT fk_departments_created_by FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.departments ADD CONSTRAINT fk_departments_updated_by FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.profiles ADD CONSTRAINT fk_profiles_created_by FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD CONSTRAINT fk_profiles_updated_by FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
