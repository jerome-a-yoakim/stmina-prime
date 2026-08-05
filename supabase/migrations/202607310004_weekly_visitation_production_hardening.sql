-- Production hardening for Weekly Visitation.
-- Additive and backward-compatible: existing identifiers, permissions, and
-- attendance behavior remain unchanged.

-- ---------------------------------------------------------------------------
-- Complete record attribution and optimistic versioning
-- ---------------------------------------------------------------------------

alter table public.member_visitation_records add column if not exists created_by uuid references public.users(id) on delete restrict;
alter table public.member_visitation_records add column if not exists updated_by uuid references public.users(id) on delete restrict;
alter table public.member_visitation_records add column if not exists version bigint not null default 1 check (version > 0);

update public.member_visitation_records
set created_by=coalesce(created_by,recorded_by), updated_by=coalesce(updated_by,recorded_by)
where created_by is null or updated_by is null;

alter table public.member_visitation_records alter column created_by set not null;
alter table public.member_visitation_records alter column updated_by set not null;

create table if not exists public.member_visitation_audit_log (
  id bigint generated always as identity primary key,
  visitation_id uuid not null references public.member_visitation_records(id) on delete restrict,
  previous_values jsonb not null,
  new_values jsonb not null,
  changed_by uuid not null references public.users(id) on delete restrict,
  changed_at timestamptz not null default now()
);
create index if not exists idx_visitation_audit_visitation_changed
  on public.member_visitation_audit_log(visitation_id,changed_at desc);
create index if not exists idx_visitation_audit_actor_changed
  on public.member_visitation_audit_log(changed_by,changed_at desc);
alter table public.member_visitation_audit_log enable row level security;

create or replace function public.prepare_member_visitation_write()
returns trigger language plpgsql set search_path=public as $$
begin
  if tg_op='INSERT' then
    new.recorded_by:=coalesce(new.recorded_by,auth.uid());
    new.created_by:=new.recorded_by;
    new.updated_by:=new.recorded_by;
    new.version:=1;
    new.created_at:=coalesce(new.created_at,now());
    new.updated_at:=coalesce(new.updated_at,new.created_at);
    return new;
  end if;

  if current_setting('app.visitation_optimistic_lock',true) is distinct from 'enabled' then
    raise exception using errcode='40001',message='VISITATION_CONFLICT';
  end if;
  if new.version<>old.version then
    raise exception using errcode='40001',message='VISITATION_CONFLICT';
  end if;
  new.created_by:=old.created_by;
  new.created_at:=old.created_at;
  new.recorded_by:=old.recorded_by;
  new.updated_by:=coalesce(new.updated_by,auth.uid());
  if new.updated_by is null then raise exception 'updated_by is required'; end if;
  new.version:=old.version+1;
  new.updated_at:=now();
  return new;
end $$;

create or replace function public.audit_member_visitation_update()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.member_visitation_audit_log
    (visitation_id,previous_values,new_values,changed_by,changed_at)
  values (new.id,to_jsonb(old),to_jsonb(new),new.updated_by,now());
  return new;
end $$;

create or replace function public.prevent_immutable_visitation_change()
returns trigger language plpgsql set search_path=public as $$
begin
  raise exception 'Visitation history is immutable and cannot be deleted';
end $$;

create or replace function public.prevent_visitation_audit_mutation()
returns trigger language plpgsql set search_path=public as $$
begin
  raise exception 'Visitation audit history is immutable';
end $$;

drop trigger if exists member_visitation_prepare_write on public.member_visitation_records;
create trigger member_visitation_prepare_write before insert or update on public.member_visitation_records
for each row execute function public.prepare_member_visitation_write();
drop trigger if exists member_visitation_audit_update on public.member_visitation_records;
create trigger member_visitation_audit_update after update on public.member_visitation_records
for each row execute function public.audit_member_visitation_update();
drop trigger if exists member_visitation_prevent_delete on public.member_visitation_records;
create trigger member_visitation_prevent_delete before delete on public.member_visitation_records
for each row execute function public.prevent_immutable_visitation_change();
drop trigger if exists visitation_audit_immutable on public.member_visitation_audit_log;
create trigger visitation_audit_immutable before update or delete on public.member_visitation_audit_log
for each row execute function public.prevent_visitation_audit_mutation();

-- Replace member cascade deletion with immutable-history protection.
alter table public.member_visitation_records drop constraint if exists member_visitation_records_member_id_fkey;
alter table public.member_visitation_records add constraint member_visitation_records_member_id_fkey
  foreign key(member_id) references public.members(id) on delete restrict;
alter table public.members add column if not exists archived_by uuid references public.users(id) on delete set null;

create or replace function public.set_member_archive_actor()
returns trigger language plpgsql set search_path=public as $$
begin
  if old.active and not new.active then
    new.archived_at:=coalesce(new.archived_at,now());
    new.archived_by:=coalesce(auth.uid(),new.archived_by);
  elsif not old.active and new.active then
    new.archived_at:=null;
    new.archived_by:=null;
  end if;
  return new;
end $$;
drop trigger if exists members_archive_actor on public.members;
create trigger members_archive_actor before update of active on public.members
for each row execute function public.set_member_archive_actor();

-- ---------------------------------------------------------------------------
-- Versioned service-wide settings
-- ---------------------------------------------------------------------------

create table if not exists public.service_settings (
  id uuid primary key default gen_random_uuid(),
  timezone text not null,
  meeting_weekday smallint not null check(meeting_weekday between 1 and 7),
  meeting_time time not null,
  attendance_deadline time not null,
  allow_visitation_after_meeting boolean not null default false,
  automatic_week_rollover boolean not null default true,
  effective_from date not null unique,
  updated_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(attendance_deadline>=meeting_time)
);
create index if not exists idx_service_settings_effective
  on public.service_settings(effective_from desc);
alter table public.service_settings enable row level security;

insert into public.service_settings
  (timezone,meeting_weekday,meeting_time,attendance_deadline,
   allow_visitation_after_meeting,automatic_week_rollover,effective_from,updated_by)
select 'Africa/Cairo',extract(isodow from sw.meeting_date)::smallint,'00:00'::time,'23:59'::time,
  false,true,sw.start_date,owner.user_id
from public.service_weeks sw
cross join lateral (
  select ur.user_id from public.user_roles ur join public.roles r on r.id=ur.role_id
  where r.code='system_owner' order by ur.starts_at limit 1
) owner
where sw.status='OPEN'
on conflict(effective_from) do nothing;

create or replace function public.validate_service_setting()
returns trigger language plpgsql set search_path=public as $$
declare local_today date;
begin
  if not exists(select 1 from pg_timezone_names where name=new.timezone) then
    raise exception 'Invalid service timezone';
  end if;
  local_today:=timezone(new.timezone,now())::date;
  if new.effective_from<=local_today then
    raise exception 'Service setting changes must take effect on a future date';
  end if;
  if tg_op='UPDATE' then raise exception 'Service settings are versioned; create a future setting instead'; end if;
  return new;
end $$;
create or replace function public.prevent_service_setting_mutation()
returns trigger language plpgsql set search_path=public as $$
begin
  raise exception 'Service settings are versioned and immutable';
end $$;
drop trigger if exists service_settings_validate on public.service_settings;
create trigger service_settings_validate before insert or update on public.service_settings
for each row execute function public.validate_service_setting();
drop trigger if exists service_settings_immutable on public.service_settings;
create trigger service_settings_immutable before update or delete on public.service_settings
for each row execute function public.prevent_service_setting_mutation();

create policy "service settings readable" on public.service_settings for select to authenticated
using(public.has_permission('member_follow_up.read') or public.has_permission('member_attendance.read')
  or public.has_permission('settings.manage'));

create or replace function public.save_service_settings(
  p_timezone text,p_meeting_weekday smallint,p_meeting_time time,
  p_attendance_deadline time,p_allow_visitation_after_meeting boolean,
  p_automatic_week_rollover boolean,p_effective_from date,p_actor uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare setting_id uuid;
begin
  if not exists(select 1 from public.users where id=p_actor and status_code='active') then
    raise exception 'Active settings administrator is required';
  end if;
  insert into public.service_settings(timezone,meeting_weekday,meeting_time,attendance_deadline,
    allow_visitation_after_meeting,automatic_week_rollover,effective_from,updated_by)
  values(p_timezone,p_meeting_weekday,p_meeting_time,p_attendance_deadline,
    p_allow_visitation_after_meeting,p_automatic_week_rollover,p_effective_from,p_actor)
  returning id into setting_id;
  return setting_id;
end $$;
revoke all on function public.save_service_settings(text,smallint,time,time,boolean,boolean,date,uuid) from public;
grant execute on function public.save_service_settings(text,smallint,time,time,boolean,boolean,date,uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Settings-aware, idempotent rollover (application calls remain a fallback)
-- ---------------------------------------------------------------------------

create or replace function public.ensure_current_service_week()
returns public.service_weeks language plpgsql security definer set search_path=public as $$
declare
  active_week public.service_weeks;
  active_setting public.service_settings;
  next_setting public.service_settings;
  local_now timestamp;
  cutoff_time time;
  next_start date;
  next_meeting date;
  days_until integer;
begin
  perform pg_advisory_xact_lock(hashtext('public.ensure_current_service_week'));
  select * into active_week from public.service_weeks where status='OPEN'
  order by start_date desc limit 1 for update;

  if active_week.id is null then
    select * into active_setting from public.service_settings order by effective_from desc limit 1;
    if active_setting.id is null then raise exception 'Service settings are required before creating a Service Week'; end if;
    local_now:=timezone(active_setting.timezone,now());
    days_until:=mod(active_setting.meeting_weekday-extract(isodow from local_now::date)::integer+7,7);
    if days_until=0 then days_until:=7; end if;
    insert into public.service_weeks(start_date,end_date,meeting_date,status)
    values(local_now::date,local_now::date+days_until-1,local_now::date+days_until,'OPEN')
    returning * into active_week;
  end if;

  loop
    select * into active_setting from public.service_settings
    where effective_from<=active_week.start_date order by effective_from desc limit 1;
    if active_setting.id is null then select * into active_setting from public.service_settings order by effective_from limit 1; end if;
    local_now:=timezone(active_setting.timezone,now());
    cutoff_time:=case when active_setting.allow_visitation_after_meeting
      then active_setting.attendance_deadline else active_setting.meeting_time end;
    exit when not active_setting.automatic_week_rollover
      or local_now::date<active_week.meeting_date
      or (local_now::date=active_week.meeting_date and local_now::time<cutoff_time);

    update public.service_weeks set status='CLOSED',closed_at=coalesce(closed_at,now()),updated_at=now()
    where id=active_week.id;
    next_start:=active_week.meeting_date;
    select * into next_setting from public.service_settings
    where effective_from<=next_start order by effective_from desc limit 1;
    if next_setting.id is null then next_setting:=active_setting; end if;
    days_until:=mod(next_setting.meeting_weekday-extract(isodow from next_start)::integer+7,7);
    if days_until=0 then days_until:=7; end if;
    next_meeting:=next_start+days_until;
    insert into public.service_weeks(start_date,end_date,meeting_date,status)
    values(next_start,next_meeting-1,next_meeting,'OPEN') returning * into active_week;
  end loop;
  return active_week;
end $$;

-- ---------------------------------------------------------------------------
-- Atomic optimistic save RPC
-- ---------------------------------------------------------------------------

create or replace function public.save_member_visitation(
  p_service_week_id uuid,p_member_id uuid,p_visitation_type_id uuid,
  p_visited_on date,p_notes text,p_actor uuid,p_record_id uuid default null,
  p_expected_version bigint default null)
returns table(id uuid,version bigint,updated_at timestamptz)
language plpgsql security definer set search_path=public as $$
declare active_week public.service_weeks; saved_id uuid;
begin
  if not exists(select 1 from public.users where id=p_actor and status_code='active') then
    raise exception 'Active visitation servant is required';
  end if;
  active_week:=public.ensure_current_service_week();
  if active_week.id<>p_service_week_id or active_week.status<>'OPEN' then
    raise exception 'أسبوع الافتقاد مغلق وأصبحت بياناته للقراءة فقط. بدأ أسبوع خدمة جديد تلقائيًا.';
  end if;
  perform set_config('app.visitation_optimistic_lock','enabled',true);

  if p_record_id is null then
    insert into public.member_visitation_records(service_week_id,member_id,visitation_type_id,
      visited_on,notes,recorded_by,created_by,updated_by)
    values(p_service_week_id,p_member_id,p_visitation_type_id,p_visited_on,p_notes,p_actor,p_actor,p_actor)
    on conflict(service_week_id,member_id,visitation_type_id) do nothing returning member_visitation_records.id into saved_id;
    if saved_id is null then raise exception using errcode='40001',message='VISITATION_CONFLICT'; end if;
  else
    if p_expected_version is null then raise exception using errcode='40001',message='VISITATION_CONFLICT'; end if;
    update public.member_visitation_records r set visited_on=p_visited_on,notes=p_notes,
      updated_by=p_actor,version=p_expected_version
    where r.id=p_record_id and r.service_week_id=p_service_week_id and r.member_id=p_member_id
      and r.visitation_type_id=p_visitation_type_id and r.version=p_expected_version
    returning r.id into saved_id;
    if saved_id is null then raise exception using errcode='40001',message='VISITATION_CONFLICT'; end if;
  end if;
  return query select r.id,r.version,r.updated_at from public.member_visitation_records r where r.id=saved_id;
end $$;
revoke all on function public.save_member_visitation(uuid,uuid,uuid,date,text,uuid,uuid,bigint) from public;
grant execute on function public.save_member_visitation(uuid,uuid,uuid,date,text,uuid,uuid,bigint) to service_role;

-- Audit visibility follows the same member/class scope; no write/delete policy.
create policy "visitation audit readable by class" on public.member_visitation_audit_log for select to authenticated
using(exists(select 1 from public.member_visitation_records r join public.members m on m.id=r.member_id
  where r.id=visitation_id and public.can_access_group(m.group_id)
  and (public.has_permission('member_follow_up.read') or public.has_permission('audit.read'))));

-- Supabase Cron invokes the idempotent function every minute; the function
-- evaluates configured timezone, meeting date, and meeting time itself.
create extension if not exists pg_cron;
do $$ begin
  if not exists(select 1 from cron.job where jobname='weekly-visitation-service-week-rollover') then
    perform cron.schedule('weekly-visitation-service-week-rollover','* * * * *',
      'select public.ensure_current_service_week();');
  end if;
end $$;
