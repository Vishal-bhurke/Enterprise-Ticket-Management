-- ============================================================
-- Migration 011: Single Active Session Policy
-- ============================================================
--
-- Adds a session_token column to the profiles table.
-- On each login, the Angular frontend generates a new UUID and
-- writes it here, atomically invalidating all other devices'
-- stored tokens.
--
-- All other devices compare their locally stored token against
-- this DB value on startup, every 60 seconds, and on tab focus.
-- A mismatch means another device has logged in → force logout.
--
-- NO existing data is affected (DEFAULT NULL).
-- Run this after migrations 001–010 have been applied.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS session_token UUID DEFAULT NULL;

-- Index for fast lookups during periodic polling
CREATE INDEX IF NOT EXISTS idx_profiles_session_token
  ON public.profiles(session_token);

-- Enable Supabase Realtime for the profiles table.
-- This allows Angular to subscribe to real-time session_token
-- changes via PostgreSQL logical replication — giving near-instant
-- (~1 second) logout detection when another device logs in.
--
-- If this command fails because profiles is already in the
-- publication, it is safe to skip it manually.
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
