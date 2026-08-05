-- Minimal weekly servant follow-up record.
-- Existing Member and servant attendance structures remain untouched.

begin;

create table if not exists public.servant_follow_up_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete restrict,
  follow_up_date date not null,
  friday_service_attendance boolean not null default false,
  liturgy_attendance boolean not null default false,
  lesson_preparation boolean not null default false,
  created_by uuid references public.users(id) on delete set null,
  updated_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, follow_up_date)
);

create index if not exists idx_servant_follow_up_records_user_date
  on public.servant_follow_up_records(user_id, follow_up_date desc);

drop trigger if exists servant_follow_up_records_set_updated_at on public.servant_follow_up_records;
create trigger servant_follow_up_records_set_updated_at
before update on public.servant_follow_up_records
for each row execute function public.set_updated_at();

-- Only System Owner and System Manager retain all-servant and mutation rights.
delete from public.role_permissions rp
using public.roles r, public.permissions p
where rp.role_id = r.id
  and rp.permission_id = p.id
  and r.code not in ('system_owner', 'system_manager')
  and p.code in (
    'servant_follow_up.read_all',
    'servant_follow_up.read_assigned',
    'servant_follow_up.record'
  );

alter table public.servant_follow_up_records enable row level security;

drop policy if exists "servants read own follow up records" on public.servant_follow_up_records;
create policy "servants read own follow up records"
on public.servant_follow_up_records for select to authenticated
using (
  user_id = auth.uid()
  or public.has_permission('servant_follow_up.read_all')
);

drop policy if exists "administrators create follow up records" on public.servant_follow_up_records;
create policy "administrators create follow up records"
on public.servant_follow_up_records for insert to authenticated
with check (public.has_permission('servant_follow_up.record'));

drop policy if exists "administrators update follow up records" on public.servant_follow_up_records;
create policy "administrators update follow up records"
on public.servant_follow_up_records for update to authenticated
using (public.has_permission('servant_follow_up.record'))
with check (public.has_permission('servant_follow_up.record'));

drop policy if exists "administrators delete follow up records" on public.servant_follow_up_records;
create policy "administrators delete follow up records"
on public.servant_follow_up_records for delete to authenticated
using (public.has_permission('servant_follow_up.record'));

commit;
