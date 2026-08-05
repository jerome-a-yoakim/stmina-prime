-- Functional replacement of Tasks with Announcements.

begin;

insert into public.permissions(code,name,category)
values
  ('announcements.read','View active announcements','Announcements'),
  ('announcements.manage','Create and manage announcements','Announcements')
on conflict(code) do update set name=excluded.name,category=excluded.category;

insert into public.role_permissions(role_id,permission_id)
select r.id,p.id from public.roles r cross join public.permissions p
where p.code='announcements.read'
on conflict do nothing;

insert into public.role_permissions(role_id,permission_id)
select r.id,p.id from public.roles r join public.permissions p on p.code='announcements.manage'
where r.code in ('system_owner','system_manager','service_coordinator','main_servant')
on conflict do nothing;

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check(char_length(btrim(title)) between 2 and 180),
  content text not null check(char_length(btrim(content)) between 2 and 10000),
  image_url text,
  start_date date not null,
  end_date date not null,
  status text not null default 'draft' check(status in ('draft','published','archived','expired')),
  created_by uuid not null references public.users(id) on delete restrict,
  updated_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  archived_at timestamptz,
  check(start_date<=end_date),
  check((status='archived' and archived_at is not null) or status<>'archived')
);

create index if not exists idx_announcements_status on public.announcements(status);
create index if not exists idx_announcements_start_date on public.announcements(start_date);
create index if not exists idx_announcements_end_date on public.announcements(end_date);
create index if not exists idx_announcements_created_by on public.announcements(created_by);
create index if not exists idx_announcements_visibility
  on public.announcements(status,start_date,end_date);

create or replace function public.set_announcement_lifecycle()
returns trigger language plpgsql set search_path=public as $$
begin
  if new.status='published' and (tg_op='INSERT' or old.status not in ('published')) then
    new.published_at:=now();
  end if;
  if new.status='archived' then new.archived_at:=coalesce(new.archived_at,now());
  elsif tg_op='INSERT' or old.status='archived' then new.archived_at:=null;
  end if;
  return new;
end $$;
drop trigger if exists announcements_lifecycle on public.announcements;
create trigger announcements_lifecycle before insert or update on public.announcements
for each row execute function public.set_announcement_lifecycle();

drop trigger if exists announcements_set_updated_at on public.announcements;
create trigger announcements_set_updated_at before update on public.announcements
for each row execute function public.set_updated_at();

create or replace function public.announcement_local_date()
returns date language sql stable security definer set search_path=public as $$
  select timezone(coalesce((select timezone from public.service_settings
    where effective_from<=current_date order by effective_from desc limit 1),'Africa/Cairo'),now())::date
$$;

alter table public.announcements enable row level security;
create policy "announcements readable by visibility" on public.announcements for select to authenticated
using(public.has_permission('announcements.manage') or (
  public.has_permission('announcements.read') and status='published'
  and public.announcement_local_date() between start_date and end_date
));
create policy "announcements insertable by managers" on public.announcements for insert to authenticated
with check(public.has_permission('announcements.manage') and created_by=auth.uid() and updated_by=auth.uid());
create policy "announcements updateable by managers" on public.announcements for update to authenticated
using(public.has_permission('announcements.manage'))
with check(public.has_permission('announcements.manage') and updated_by=auth.uid());
create policy "announcements deletable by managers" on public.announcements for delete to authenticated
using(public.has_permission('announcements.manage'));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('announcements','announcements',true,5242880,array['image/jpeg','image/png','image/webp','image/gif'])
on conflict(id) do update set public=true,file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

create or replace function public.expire_announcements()
returns void language plpgsql security definer set search_path=public as $$
declare local_today date;
begin
  local_today:=public.announcement_local_date();
  update public.announcements set status='expired',updated_at=now()
  where status='published' and end_date<local_today;
end $$;
revoke all on function public.expire_announcements() from public;
grant execute on function public.expire_announcements() to service_role;

create extension if not exists pg_cron;
do $$ begin
  if not exists(select 1 from cron.job where jobname='expire-announcements') then
    perform cron.schedule('expire-announcements','0 * * * *','select public.expire_announcements();');
  end if;
end $$;
select public.expire_announcements();

-- Remove task-derived statistics while preserving all unrelated follow-up data.
drop view if exists public.user_monthly_follow_up_statistics;
create view public.user_monthly_follow_up_statistics with(security_invoker=true) as
with activity_months as (
  select sar.user_id,date_trunc('month',sfs.session_date)::date month_start
  from public.servant_attendance_records sar
  join public.servant_follow_up_sessions sfs on sfs.id=sar.session_id
  union
  select lp.user_id,date_trunc('month',lp.lesson_date)::date
  from public.lesson_preparations lp
), attendance as (
  select sar.user_id,date_trunc('month',sfs.session_date)::date month_start,
    count(*) filter(where sety.code='liturgy') liturgy_records,
    count(*) filter(where sety.code='liturgy' and sar.status='present') liturgy_present,
    count(*) filter(where sety.code='friday_service') friday_records,
    count(*) filter(where sety.code='friday_service' and sar.status='present') friday_present
  from public.servant_attendance_records sar
  join public.servant_follow_up_sessions sfs on sfs.id=sar.session_id
  join public.servant_event_types sety on sety.id=sfs.event_type_id
  group by sar.user_id,date_trunc('month',sfs.session_date)
), lessons as (
  select lp.user_id,date_trunc('month',lp.lesson_date)::date month_start,
    count(*) lesson_records,count(*) filter(where lp.status in ('prepared','reviewed')) lessons_prepared
  from public.lesson_preparations lp group by lp.user_id,date_trunc('month',lp.lesson_date)
)
select u.id user_id,u.full_name,m.month_start,
  coalesce(a.liturgy_records,0) liturgy_records,coalesce(a.liturgy_present,0) liturgy_present,
  coalesce(a.friday_records,0) friday_records,coalesce(a.friday_present,0) friday_present,
  coalesce(l.lesson_records,0) lesson_records,coalesce(l.lessons_prepared,0) lessons_prepared,
  round(100.0*(coalesce(a.liturgy_present,0)+coalesce(a.friday_present,0))
    /nullif(coalesce(a.liturgy_records,0)+coalesce(a.friday_records,0),0),2) attendance_rate,
  round(100.0*coalesce(l.lessons_prepared,0)/nullif(coalesce(l.lesson_records,0),0),2) lesson_preparation_rate
from activity_months m join public.users u on u.id=m.user_id
left join attendance a on a.user_id=m.user_id and a.month_start=m.month_start
left join lessons l on l.user_id=m.user_id and l.month_start=m.month_start;

drop table if exists public.task_status_history cascade;
drop table if exists public.task_assignees cascade;
drop table if exists public.tasks cascade;
delete from public.app_audit_logs where entity_type='task' or action like 'task.%';
delete from public.role_permissions rp using public.permissions p
where rp.permission_id=p.id and p.code like 'tasks.%';
delete from public.permissions where code like 'tasks.%';

commit;
