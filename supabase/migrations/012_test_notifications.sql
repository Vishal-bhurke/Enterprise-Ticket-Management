-- Migration 012: Test Run Logs + Notifications Infrastructure
-- Apply via Supabase Dashboard → SQL Editor
-- or: supabase db push (if using Supabase CLI)

-- ============================================================
-- Table: test_run_logs
-- Stores results of each automated test run (post-deploy)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.test_run_logs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deployment_url TEXT,
  total_tests   INT         NOT NULL DEFAULT 0,
  passed        INT         NOT NULL DEFAULT 0,
  failed        INT         NOT NULL DEFAULT 0,
  skipped       INT         NOT NULL DEFAULT 0,
  duration_ms   INT,
  status        TEXT        NOT NULL CHECK (status IN ('passed', 'failed', 'partial')),
  report_url    TEXT,
  raw_results   JSONB
);

-- Enable RLS
ALTER TABLE public.test_run_logs ENABLE ROW LEVEL SECURITY;

-- Admins and super_admins can read test logs
CREATE POLICY "test_logs_admin_read"
  ON public.test_run_logs
  FOR SELECT
  USING (public.get_user_role() IN ('super_admin', 'admin'));

-- Service role key (used by notify-admin.ts) can insert results
-- (Service role bypasses RLS automatically — this policy is for clarity)
CREATE POLICY "test_logs_service_insert"
  ON public.test_run_logs
  FOR INSERT
  WITH CHECK (TRUE);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_test_run_logs_run_at ON public.test_run_logs(run_at DESC);

-- ============================================================
-- Verify notifications table exists (created in earlier migration)
-- If not, create a minimal version here
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications' AND table_schema = 'public') THEN
    CREATE TABLE public.notifications (
      id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      type       TEXT        NOT NULL,
      title      TEXT        NOT NULL,
      message    TEXT,
      is_read    BOOLEAN     NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "notifications_owner_access"
      ON public.notifications
      FOR ALL
      USING (user_id = auth.uid());

    CREATE INDEX idx_notifications_user_id ON public.notifications(user_id, is_read, created_at DESC);
  END IF;
END $$;

-- ============================================================
-- Grant usage to authenticated role (if not already granted)
-- ============================================================
GRANT SELECT, INSERT ON public.test_run_logs TO authenticated;
GRANT SELECT, INSERT ON public.notifications TO authenticated;
