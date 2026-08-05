-- Additive fields required by the official member registration form.
-- full_name remains the canonical display name used by existing workflows.
alter table public.members
  add column if not exists given_name text,
  add column if not exists father_name text,
  add column if not exists additional_family_phone text,
  add column if not exists birth_date date;
