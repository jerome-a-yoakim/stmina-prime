-- ============================================================
-- Migration: 202607250003_sync_canonical_schema.sql
-- Purpose:   Synchronize Supabase with the canonical schema
--            inferred from the repository code.
-- Strategy:  Additive only. Safe to re-run.
-- Generated: 2026-07-25
-- ============================================================

-- ─── STEP 1: Extend app_role enum ────────────────────────────
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'family';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'teacher';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'class_leader';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'secretary';

-- ─── STEP 2: Extend profiles table ───────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS enabled boolean NOT NULL DEFAULT true;

-- ─── STEP 3: Extend groups table ─────────────────────────────
ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS main_servant       text,
  ADD COLUMN IF NOT EXISTS assistant_servants text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS servant_contact    text;

-- ─── STEP 4: Extend members table ────────────────────────────
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS brother_of_lord boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at     timestamptz;

-- ─── STEP 5: Remove Friday-only CHECK constraint ──────────────
ALTER TABLE public.attendance_sessions
  DROP CONSTRAINT IF EXISTS attendance_sessions_check;

-- ─── STEP 6: Create member_notes table ───────────────────────
CREATE TABLE IF NOT EXISTS public.member_notes (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id  uuid        NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  title      text        NOT NULL,
  content    text        NOT NULL DEFAULT '',
  category   text        NOT NULL DEFAULT 'General',
  created_by uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.member_notes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'member_notes' AND policyname = 'notes by group access'
  ) THEN
    CREATE POLICY "notes by group access" ON public.member_notes
      FOR ALL TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.members m
        WHERE m.id = member_id AND public.can_access_group(m.group_id)
      ))
      WITH CHECK (EXISTS (
        SELECT 1 FROM public.members m
        WHERE m.id = member_id AND public.can_access_group(m.group_id)
      ));
  END IF;
END $$;

-- ─── STEP 7: Performance indexes ─────────────────────────────
CREATE INDEX IF NOT EXISTS idx_members_group_id          ON public.members(group_id);
CREATE INDEX IF NOT EXISTS idx_members_active             ON public.members(active);
CREATE INDEX IF NOT EXISTS idx_att_records_session_id    ON public.attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_att_records_member_id     ON public.attendance_records(member_id);
CREATE INDEX IF NOT EXISTS idx_member_notes_member_id    ON public.member_notes(member_id);
CREATE INDEX IF NOT EXISTS idx_att_sessions_date         ON public.attendance_sessions(attendance_date DESC);

-- ─── STEP 8: Verify (all values should = 1) ──────────────────
SELECT
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name='profiles'  AND column_name='enabled')           AS profiles_enabled,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name='groups'    AND column_name='main_servant')       AS groups_main_servant,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name='groups'    AND column_name='assistant_servants') AS groups_assistant_servants,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name='members'   AND column_name='brother_of_lord')    AS members_brother_of_lord,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name='members'   AND column_name='archived_at')        AS members_archived_at,
  (SELECT COUNT(*) FROM information_schema.tables  WHERE table_name='member_notes')                                   AS member_notes_table;
