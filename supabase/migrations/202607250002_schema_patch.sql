-- Migration: 202607250002_schema_patch.sql
-- Purpose: Fix schema gaps identified in architecture audit.
-- All changes are additive (ADD COLUMN IF NOT EXISTS, CREATE IF NOT EXISTS).
-- Safe to re-run. No data loss.

-- ─── 1. Extend app_role enum ─────────────────────────────────────────────────
-- The legacy app uses 6 roles; the schema only had 2. Adding the remaining 4
-- preserves the business-level role distinctions while keeping RLS binary
-- (is_admin checks for 'admin'; everything else is non-admin).
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'family';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'teacher';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'class_leader';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'secretary';

-- ─── 2. Extend profiles table ────────────────────────────────────────────────
-- enabled: allows admins to disable user accounts without deleting them.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS enabled boolean NOT NULL DEFAULT true;

-- ─── 3. Extend groups table ──────────────────────────────────────────────────
-- These columns store display-only servant metadata. They are separate from
-- the group_servants join table which handles RLS group-access assignments.
ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS main_servant    text,
  ADD COLUMN IF NOT EXISTS assistant_servants text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS servant_contact text;

-- ─── 4. Extend members table ─────────────────────────────────────────────────
-- brother_of_lord: business flag used in the member profile UI.
-- archived_at: timestamp for soft-delete/archive workflow.
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS brother_of_lord boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at     timestamptz;

-- ─── 5. Create member_notes table ────────────────────────────────────────────
-- Notes attached to individual members, gated by group access via RLS.
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

-- RLS: users can access notes for members in groups they have access to.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'member_notes' AND policyname = 'notes by group access'
  ) THEN
    CREATE POLICY "notes by group access" ON public.member_notes
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.members m
          WHERE m.id = member_id
            AND public.can_access_group(m.group_id)
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.members m
          WHERE m.id = member_id
            AND public.can_access_group(m.group_id)
        )
      );
  END IF;
END $$;
