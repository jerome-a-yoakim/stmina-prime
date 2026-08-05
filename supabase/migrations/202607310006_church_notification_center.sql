begin;

create type public.notification_type as enum ('INFO', 'SUCCESS', 'WARNING', 'IMPORTANT');

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references public.users(id) on delete cascade,
  type public.notification_type not null,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  message text not null check (char_length(btrim(message)) between 1 and 1000),
  related_entity_type text not null check (related_entity_type ~ '^[a-z][a-z0-9_]*$'),
  related_entity_id uuid,
  family_id uuid references public.groups(id) on delete cascade,
  target_url text not null check (target_url like '/%'),
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  is_read boolean not null default false,
  grouping_key text,
  event_count integer not null default 1 check (event_count > 0),
  archived_at timestamptz,
  constraint notification_read_state check (
    (is_read and read_at is not null) or (not is_read and read_at is null)
  )
);

create index idx_notifications_recipient_created
  on public.notifications(recipient_user_id, created_at desc) where archived_at is null;
create index idx_notifications_recipient_unread
  on public.notifications(recipient_user_id, is_read, created_at desc) where archived_at is null;
create index idx_notifications_family_created on public.notifications(family_id, created_at desc);
create index idx_notifications_entity on public.notifications(related_entity_type, related_entity_id);
create index idx_notifications_cleanup on public.notifications(created_at);
create index idx_notifications_grouping
  on public.notifications(recipient_user_id, grouping_key, created_at desc)
  where grouping_key is not null and is_read = false and archived_at is null;

comment on table public.notifications is
  'Recipient-owned notifications. Writes are allowed only through dispatch_notifications().';

create table public.member_notification_states (
  member_id uuid primary key references public.members(id) on delete cascade,
  absence_status text not null check (absence_status in ('regular','important','critical','danger')),
  updated_at timestamptz not null default now()
);

alter table public.member_notes
  add column if not exists is_important boolean not null default false,
  add column if not exists updated_by uuid references public.users(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists member_notes_set_updated_at on public.member_notes;
create trigger member_notes_set_updated_at before update on public.member_notes
for each row execute function public.set_updated_at();

create or replace function public.dispatch_notifications(
  p_recipient_ids uuid[],
  p_type public.notification_type,
  p_title text,
  p_message text,
  p_related_entity_type text,
  p_related_entity_id uuid,
  p_family_id uuid,
  p_target_url text,
  p_created_by uuid,
  p_grouping_key text default null,
  p_grouped_message text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient_id uuid;
  existing_id uuid;
  next_count integer;
  delivered integer := 0;
begin
  if coalesce(array_length(p_recipient_ids, 1), 0) = 0 then return 0; end if;
  if p_target_url not like '/%' then raise exception 'Notification target must be an internal path'; end if;

  foreach recipient_id in array p_recipient_ids loop
    if recipient_id is null or recipient_id = p_created_by then continue; end if;
    if not exists(select 1 from public.users u where u.id = recipient_id and u.status_code = 'active') then
      continue;
    end if;

    existing_id := null;
    if p_grouping_key is not null then
      select n.id, n.event_count + 1 into existing_id, next_count
      from public.notifications n
      where n.recipient_user_id = recipient_id
        and n.grouping_key = p_grouping_key
        and not n.is_read and n.archived_at is null
        and n.created_at >= now() - interval '10 minutes'
      order by n.created_at desc limit 1 for update;
    end if;

    if existing_id is not null then
      update public.notifications set
        type = p_type,
        title = p_title,
        message = case when p_grouped_message is null then p_message
          else replace(p_grouped_message, '{count}', next_count::text) end,
        event_count = next_count,
        related_entity_id = p_related_entity_id,
        target_url = p_target_url,
        created_at = now()
      where id = existing_id;
    else
      insert into public.notifications(recipient_user_id,type,title,message,related_entity_type,
        related_entity_id,family_id,target_url,created_by,grouping_key)
      values(recipient_id,p_type,p_title,p_message,p_related_entity_type,p_related_entity_id,
        p_family_id,p_target_url,p_created_by,p_grouping_key);
    end if;
    delivered := delivered + 1;
  end loop;
  return delivered;
end;
$$;

revoke all on function public.dispatch_notifications(uuid[],public.notification_type,text,text,text,uuid,uuid,text,uuid,text,text) from public;
grant execute on function public.dispatch_notifications(uuid[],public.notification_type,text,text,text,uuid,uuid,text,uuid,text,text) to service_role;

create or replace function public.notification_recipients_for_family(p_family_id uuid)
returns uuid[] language sql stable security definer set search_path=public as $$
  select coalesce(array_agg(distinct a.user_id), '{}'::uuid[])
  from public.user_class_assignments a
  join public.users u on u.id = a.user_id and u.status_code = 'active'
  where a.group_id = p_family_id and a.starts_on <= current_date
    and (a.ends_on is null or a.ends_on >= current_date)
$$;
revoke all on function public.notification_recipients_for_family(uuid) from public;
grant execute on function public.notification_recipients_for_family(uuid) to service_role;

create or replace function public.notify_service_week_change()
returns trigger language plpgsql security definer set search_path=public as $$
declare family record; recipients uuid[];
begin
  if tg_op = 'INSERT' and new.status = 'OPEN' then
    for family in select id from public.groups where active loop
      recipients := public.notification_recipients_for_family(family.id);
      perform public.dispatch_notifications(recipients,'INFO','بدء أسبوع خدمة جديد',
        'تم فتح أسبوع خدمة جديد ويمكن البدء في تسجيل المتابعة والافتقاد.',
        'service_week',new.id,family.id,'/dashboard/attendance',null,
        'service_week_open:' || new.id::text || ':' || family.id::text,null);
    end loop;
  elsif tg_op = 'UPDATE' and old.status <> 'CLOSED' and new.status = 'CLOSED' then
    for family in select id from public.groups where active loop
      recipients := public.notification_recipients_for_family(family.id);
      perform public.dispatch_notifications(recipients,'SUCCESS','إغلاق أسبوع الخدمة',
        'تم إغلاق أسبوع الخدمة وحفظ بياناته للقراءة.',
        'service_week',new.id,family.id,'/dashboard/attendance',null,
        'service_week_closed:' || new.id::text || ':' || family.id::text,null);
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists service_week_notifications on public.service_weeks;
create trigger service_week_notifications after insert or update of status on public.service_weeks
for each row execute function public.notify_service_week_change();

create or replace function public.cleanup_old_notifications()
returns integer language plpgsql security definer set search_path=public as $$
declare removed integer;
begin
  delete from public.notifications where created_at < now() - interval '90 days';
  get diagnostics removed = row_count;
  return removed;
end;
$$;
revoke all on function public.cleanup_old_notifications() from public;
grant execute on function public.cleanup_old_notifications() to service_role;

create extension if not exists pg_cron;
do $$ begin
  if not exists(select 1 from cron.job where jobname = 'cleanup-church-notifications') then
    perform cron.schedule('cleanup-church-notifications','17 2 * * *',
      'select public.cleanup_old_notifications();');
  end if;
end $$;

alter table public.notifications enable row level security;
alter table public.member_notification_states enable row level security;

create policy "notifications visible to recipient or administrator"
on public.notifications for select to authenticated
using(recipient_user_id = auth.uid() or public.is_admin());
create policy "recipients update notification read state"
on public.notifications for update to authenticated
using(recipient_user_id = auth.uid()) with check(recipient_user_id = auth.uid());

revoke insert, update, delete on public.notifications from authenticated;
grant update(is_read, read_at) on public.notifications to authenticated;
revoke all on public.member_notification_states from authenticated;

do $$ begin
  if not exists(select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

commit;
