-- Upgrade installations that already ran 202607310002 before meeting dates
-- became configurable. This migration contains no weekday assumption.

drop trigger if exists member_visitation_validate on public.member_visitation_records;

alter table public.service_weeks drop constraint if exists service_weeks_ends_on_check;
alter table public.service_weeks drop constraint if exists service_weeks_starts_on_check;
alter table public.service_weeks drop constraint if exists service_weeks_check;
alter table public.service_weeks drop constraint if exists service_weeks_check1;
alter table public.service_weeks drop constraint if exists service_weeks_status_check;
alter table public.service_weeks drop constraint if exists service_weeks_date_order_check;
alter table public.service_weeks drop constraint if exists service_weeks_meeting_boundary_check;

do $$ begin
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='service_weeks' and column_name='starts_on') then
    alter table public.service_weeks rename column starts_on to start_date;
  end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='service_weeks' and column_name='ends_on') then
    alter table public.service_weeks rename column ends_on to end_date;
  end if;
end $$;

alter table public.service_weeks add column if not exists meeting_date date;
alter table public.service_weeks add column if not exists status text;
alter table public.service_weeks add column if not exists updated_at timestamptz not null default now();
update public.service_weeks set meeting_date=end_date+1 where meeting_date is null;
update public.service_weeks set status=case when closed_at is null then 'OPEN' else 'CLOSED' end where status is null;
alter table public.service_weeks alter column meeting_date set not null;
alter table public.service_weeks alter column status set not null;
alter table public.service_weeks alter column status set default 'OPEN';
alter table public.service_weeks add constraint service_weeks_status_check check(status in ('OPEN','CLOSED'));
alter table public.service_weeks add constraint service_weeks_date_order_check check(end_date >= start_date);
alter table public.service_weeks add constraint service_weeks_meeting_boundary_check check(meeting_date=end_date+1);

alter table public.member_visitation_records add column if not exists updated_at timestamptz not null default now();

-- Preserve any pre-refactor duplicates in an audit archive before enforcing
-- the one-value-per-type-per-member-per-week invariant.
create table if not exists public.member_visitation_record_revisions
(like public.member_visitation_records including defaults including constraints);
alter table public.member_visitation_record_revisions add column if not exists archived_at timestamptz not null default now();
alter table public.member_visitation_record_revisions enable row level security;
insert into public.member_visitation_record_revisions
select duplicate.*, now() from (
  select r.*, row_number() over(partition by service_week_id,member_id,visitation_type_id order by created_at desc,id desc) as rn
  from public.member_visitation_records r
) ranked join public.member_visitation_records duplicate on duplicate.id=ranked.id where ranked.rn>1;
delete from public.member_visitation_records r using (
  select id,row_number() over(partition by service_week_id,member_id,visitation_type_id order by created_at desc,id desc) rn
  from public.member_visitation_records
) ranked where r.id=ranked.id and ranked.rn>1;

create unique index if not exists uq_member_visitation_week_member_type
  on public.member_visitation_records(service_week_id,member_id,visitation_type_id);
create unique index if not exists idx_service_weeks_single_open on public.service_weeks(status) where status='OPEN';
create index if not exists idx_service_weeks_status_meeting on public.service_weeks(status,meeting_date);

create or replace function public.ensure_current_service_week()
returns public.service_weeks language plpgsql security definer set search_path=public as $$
declare local_today date:=timezone('Africa/Cairo',now())::date; active_week public.service_weeks; cadence_days integer;
begin
  perform pg_advisory_xact_lock(hashtext('public.ensure_current_service_week'));
  select * into active_week from public.service_weeks where status='OPEN' order by start_date desc limit 1 for update;
  if active_week.id is null then
    insert into public.service_weeks(start_date,end_date,meeting_date,status)
    values(local_today,local_today+6,local_today+7,'OPEN') returning * into active_week;
  end if;
  while local_today>=active_week.meeting_date loop
    cadence_days:=greatest(active_week.meeting_date-active_week.start_date,1);
    update public.service_weeks set status='CLOSED',closed_at=coalesce(closed_at,now()),updated_at=now() where id=active_week.id;
    insert into public.service_weeks(start_date,end_date,meeting_date,status)
    values(active_week.meeting_date,active_week.meeting_date+cadence_days-1,active_week.meeting_date+cadence_days,'OPEN')
    returning * into active_week;
  end loop;
  return active_week;
end $$;

create or replace function public.validate_member_visitation_record()
returns trigger language plpgsql set search_path=public as $$
declare local_today date:=timezone('Africa/Cairo',now())::date; selected_week public.service_weeks;
begin
  perform public.ensure_current_service_week();
  select * into selected_week from public.service_weeks where id=new.service_week_id;
  if selected_week.id is null then raise exception 'أسبوع الخدمة غير موجود.'; end if;
  if selected_week.status<>'OPEN' then raise exception 'أسبوع الافتقاد مغلق وأصبحت بياناته للقراءة فقط.'; end if;
  if new.visited_on<selected_week.start_date or new.visited_on>selected_week.end_date then raise exception 'تاريخ الافتقاد لا يقع داخل أسبوع الخدمة المفتوح.'; end if;
  if new.visited_on>local_today then raise exception 'لا يمكن تسجيل افتقاد بتاريخ مستقبلي.'; end if;
  if not exists(select 1 from public.visitation_types where id=new.visitation_type_id and active) then raise exception 'نوع الافتقاد غير متاح.'; end if;
  return new;
end $$;

create trigger member_visitation_validate before insert or update on public.member_visitation_records
for each row execute function public.validate_member_visitation_record();
drop trigger if exists member_visitation_updated_at on public.member_visitation_records;
create trigger member_visitation_updated_at before update on public.member_visitation_records
for each row execute function public.set_updated_at();
drop trigger if exists service_weeks_updated_at on public.service_weeks;
create trigger service_weeks_updated_at before update on public.service_weeks
for each row execute function public.set_updated_at();

drop policy if exists "service weeks readable" on public.service_weeks;
create policy "service weeks readable" on public.service_weeks for select to authenticated
using(public.has_permission('member_follow_up.read') or public.has_permission('member_attendance.read'));
drop policy if exists "visitation types readable" on public.visitation_types;
create policy "visitation types readable" on public.visitation_types for select to authenticated
using(public.has_permission('member_follow_up.read') or public.has_permission('member_attendance.read'));
drop policy if exists "member visitations readable by class" on public.member_visitation_records;
create policy "member visitations readable by class" on public.member_visitation_records for select to authenticated
using((public.has_permission('member_follow_up.read') or public.has_permission('member_attendance.read'))
and exists(select 1 from public.members m where m.id=member_id and public.can_access_group(m.group_id)));
drop policy if exists "open member visitations updateable by class" on public.member_visitation_records;
create policy "open member visitations updateable by class" on public.member_visitation_records for update to authenticated
using(public.has_permission('member_follow_up.write') and exists(select 1 from public.service_weeks sw where sw.id=service_week_id and sw.status='OPEN')
and exists(select 1 from public.members m where m.id=member_id and public.can_access_group(m.group_id)))
with check(recorded_by=auth.uid() and public.has_permission('member_follow_up.write')
and exists(select 1 from public.service_weeks sw where sw.id=service_week_id and sw.status='OPEN')
and exists(select 1 from public.members m where m.id=member_id and public.can_access_group(m.group_id)));

select public.ensure_current_service_week();
