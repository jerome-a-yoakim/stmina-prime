-- Central weekly visitation workflow.
-- Meeting dates are data, never a hardcoded weekday. Attendance remains the
-- sole source of truth for attendance and calculated absence severity.

create table if not exists public.service_weeks (
  id uuid primary key default gen_random_uuid(),
  start_date date not null unique,
  end_date date not null,
  meeting_date date not null unique,
  status text not null default 'OPEN' check (status in ('OPEN', 'CLOSED')),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date),
  check (meeting_date = end_date + 1)
);

create unique index if not exists idx_service_weeks_single_open
  on public.service_weeks (status) where status = 'OPEN';
create index if not exists idx_service_weeks_status_meeting
  on public.service_weeks (status, meeting_date);

create table if not exists public.visitation_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z][a-z0-9_]*$'),
  name_ar text not null,
  icon text not null default '',
  color text not null default '#8b1538',
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.visitation_types (code, name_ar, icon, color, sort_order)
values
  ('phone', 'افتقاد تليفوني', '☎', '#d97706', 10),
  ('home', 'افتقاد منزلي', '⌂', '#8b1538', 20)
on conflict (code) do update set name_ar=excluded.name_ar, icon=excluded.icon,
  color=excluded.color, sort_order=excluded.sort_order;

create table if not exists public.member_visitation_records (
  id uuid primary key default gen_random_uuid(),
  service_week_id uuid not null references public.service_weeks(id) on delete restrict,
  member_id uuid not null references public.members(id) on delete cascade,
  visitation_type_id uuid not null references public.visitation_types(id) on delete restrict,
  visited_on date not null,
  notes text not null default '' check (char_length(notes) <= 2000),
  recorded_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (service_week_id, member_id, visitation_type_id)
);

create index if not exists idx_member_visitation_week_member
  on public.member_visitation_records (service_week_id, member_id);
create index if not exists idx_member_visitation_member_date
  on public.member_visitation_records (member_id, visited_on desc);
create index if not exists idx_member_visitation_type_week
  on public.member_visitation_records (visitation_type_id, service_week_id);
create index if not exists idx_member_visitation_servant_date
  on public.member_visitation_records (recorded_by, visited_on desc);
create index if not exists idx_attendance_records_member_session
  on public.attendance_records (member_id, session_id);

create or replace function public.ensure_current_service_week()
returns public.service_weeks
language plpgsql security definer set search_path = public
as $$
declare
  local_today date := timezone('Africa/Cairo', now())::date;
  active_week public.service_weeks;
  cadence_days integer;
begin
  perform pg_advisory_xact_lock(hashtext('public.ensure_current_service_week'));
  select * into active_week from public.service_weeks where status='OPEN'
  order by start_date desc limit 1 for update;

  if active_week.id is null then
    insert into public.service_weeks (start_date, end_date, meeting_date, status)
    values (local_today, local_today + 6, local_today + 7, 'OPEN')
    returning * into active_week;
  end if;

  while local_today >= active_week.meeting_date loop
    cadence_days := greatest(active_week.meeting_date - active_week.start_date, 1);
    update public.service_weeks set status='CLOSED', closed_at=coalesce(closed_at, now()), updated_at=now()
    where id=active_week.id;
    insert into public.service_weeks (start_date, end_date, meeting_date, status)
    values (active_week.meeting_date,
      active_week.meeting_date + cadence_days - 1,
      active_week.meeting_date + cadence_days, 'OPEN')
    returning * into active_week;
  end loop;
  return active_week;
end;
$$;

create or replace function public.validate_member_visitation_record()
returns trigger language plpgsql set search_path = public
as $$
declare
  local_today date := timezone('Africa/Cairo', now())::date;
  selected_week public.service_weeks;
begin
  perform public.ensure_current_service_week();
  select * into selected_week from public.service_weeks where id=new.service_week_id;
  if selected_week.id is null then raise exception 'أسبوع الخدمة غير موجود.'; end if;
  if selected_week.status <> 'OPEN' then
    raise exception 'أسبوع الافتقاد مغلق وأصبحت بياناته للقراءة فقط.';
  end if;
  if new.visited_on < selected_week.start_date or new.visited_on > selected_week.end_date then
    raise exception 'تاريخ الافتقاد لا يقع داخل أسبوع الخدمة المفتوح.';
  end if;
  if new.visited_on > local_today then raise exception 'لا يمكن تسجيل افتقاد بتاريخ مستقبلي.'; end if;
  if not exists(select 1 from public.visitation_types where id=new.visitation_type_id and active) then
    raise exception 'نوع الافتقاد غير متاح.';
  end if;
  return new;
end;
$$;

drop trigger if exists member_visitation_validate on public.member_visitation_records;
create trigger member_visitation_validate before insert or update on public.member_visitation_records
for each row execute function public.validate_member_visitation_record();
drop trigger if exists member_visitation_updated_at on public.member_visitation_records;
create trigger member_visitation_updated_at before update on public.member_visitation_records
for each row execute function public.set_updated_at();
drop trigger if exists service_weeks_updated_at on public.service_weeks;
create trigger service_weeks_updated_at before update on public.service_weeks
for each row execute function public.set_updated_at();

alter table public.service_weeks enable row level security;
alter table public.visitation_types enable row level security;
alter table public.member_visitation_records enable row level security;

create policy "service weeks readable" on public.service_weeks for select to authenticated
using (public.has_permission('member_follow_up.read') or public.has_permission('member_attendance.read'));
create policy "visitation types readable" on public.visitation_types for select to authenticated
using (public.has_permission('member_follow_up.read') or public.has_permission('member_attendance.read'));
create policy "member visitations readable by class" on public.member_visitation_records for select to authenticated
using ((public.has_permission('member_follow_up.read') or public.has_permission('member_attendance.read'))
  and exists(select 1 from public.members m where m.id=member_id and public.can_access_group(m.group_id)));
create policy "member visitations insertable by class" on public.member_visitation_records for insert to authenticated
with check (recorded_by=auth.uid() and public.has_permission('member_follow_up.write')
  and exists(select 1 from public.members m where m.id=member_id and public.can_access_group(m.group_id)));
create policy "open member visitations updateable by class" on public.member_visitation_records for update to authenticated
using (public.has_permission('member_follow_up.write')
  and exists(select 1 from public.members m where m.id=member_id and public.can_access_group(m.group_id))
  and exists(select 1 from public.service_weeks sw where sw.id=service_week_id and sw.status='OPEN'))
with check (recorded_by=auth.uid() and public.has_permission('member_follow_up.write')
  and exists(select 1 from public.members m where m.id=member_id and public.can_access_group(m.group_id))
  and exists(select 1 from public.service_weeks sw where sw.id=service_week_id and sw.status='OPEN'));

revoke all on function public.ensure_current_service_week() from public;
grant execute on function public.ensure_current_service_week() to service_role;
select public.ensure_current_service_week();
