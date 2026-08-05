-- Users, RBAC, tasks, servant follow-up, evaluations, and audit architecture.
-- Additive migration: existing Member data and Member attendance remain intact.

begin;

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Account lifecycle and domain Users
-- ---------------------------------------------------------------------------

create table if not exists public.account_statuses (
  code text primary key,
  name text not null,
  allows_login boolean not null default false,
  terminal boolean not null default false,
  sort_order integer not null default 0
);

insert into public.account_statuses (code, name, allows_login, terminal, sort_order)
values
  ('pending_invitation', 'Pending invitation', false, false, 10),
  ('active', 'Active', true, false, 20),
  ('suspended', 'Suspended', false, false, 30),
  ('archived', 'Archived', false, true, 40)
on conflict (code) do update set
  name = excluded.name,
  allows_login = excluded.allows_login,
  terminal = excluded.terminal,
  sort_order = excluded.sort_order;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete restrict,
  full_name text not null,
  photo_path text,
  phone text,
  alternate_phone text,
  contact_email text,
  status_code text not null default 'pending_invitation'
    references public.account_statuses(code),
  must_change_password boolean not null default false,
  last_login_at timestamptz,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  check (archived_at is null or status_code = 'archived')
);

create index if not exists idx_users_status on public.users(status_code);
create index if not exists idx_users_full_name on public.users(full_name);

-- ---------------------------------------------------------------------------
-- RBAC
-- ---------------------------------------------------------------------------

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text not null default '',
  protected boolean not null default false,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text not null default '',
  category text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_id)
);

create table if not exists public.user_roles (
  user_id uuid not null references public.users(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete restrict,
  assigned_by uuid references public.users(id) on delete set null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (user_id, role_id),
  check (ends_at is null or ends_at > starts_at)
);

create table if not exists public.role_assignment_policies (
  grantor_role_id uuid not null references public.roles(id) on delete cascade,
  grantable_role_id uuid not null references public.roles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (grantor_role_id, grantable_role_id)
);

create index if not exists idx_user_roles_role on public.user_roles(role_id);
create index if not exists idx_role_permissions_permission on public.role_permissions(permission_id);

insert into public.roles (code, name, description, protected, sort_order)
values
  ('system_owner', 'System Owner', 'Highest-trust platform owner', true, 10),
  ('system_manager', 'System Manager', 'Manages Users and service configuration', true, 20),
  ('main_servant', 'Main Servant', 'Leads servants and class follow-up', false, 30),
  ('servant', 'Servant', 'Serves assigned classes and Members', false, 40),
  ('secretary', 'Secretary', 'Supports attendance and reporting operations', false, 50)
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  protected = excluded.protected,
  sort_order = excluded.sort_order;

insert into public.permissions (code, name, category)
values
  ('users.read', 'View Users', 'Users'),
  ('users.create', 'Create Users', 'Users'),
  ('users.update', 'Update Users', 'Users'),
  ('users.suspend', 'Suspend Users', 'Users'),
  ('users.assign_roles', 'Assign roles', 'Users'),
  ('roles.read', 'View roles and permissions', 'Access Control'),
  ('roles.manage', 'Manage roles and permissions', 'Access Control'),
  ('classes.assign_users', 'Assign Users to classes', 'Classes'),
  ('responsibilities.manage', 'Manage responsibilities', 'Users'),
  ('members.read', 'View Members', 'Members'),
  ('members.update', 'Manage Members', 'Members'),
  ('member_follow_up.read', 'View Member follow-up', 'Members'),
  ('member_follow_up.write', 'Manage Member follow-up', 'Members'),
  ('member_attendance.read', 'View Member attendance', 'Members'),
  ('member_attendance.write', 'Manage Member attendance', 'Members'),
  ('servant_follow_up.read_own', 'View own servant follow-up', 'Servant Follow-up'),
  ('servant_follow_up.read_assigned', 'View supervised servant follow-up', 'Servant Follow-up'),
  ('servant_follow_up.read_all', 'View all servant follow-up', 'Servant Follow-up'),
  ('servant_follow_up.record', 'Record servant follow-up', 'Servant Follow-up'),
  ('evaluations.read_own', 'View own evaluations', 'Evaluations'),
  ('evaluations.read_assigned', 'View supervised evaluations', 'Evaluations'),
  ('evaluations.manage', 'Create and finalize evaluations', 'Evaluations'),
  ('tasks.read_own', 'View assigned tasks', 'Tasks'),
  ('tasks.update_own', 'Update assigned task status', 'Tasks'),
  ('tasks.assign', 'Assign tasks', 'Tasks'),
  ('tasks.manage', 'Manage all tasks', 'Tasks'),
  ('audit.read', 'View audit logs', 'Administration'),
  ('settings.manage', 'Manage system settings', 'Administration'),
  ('reports.read', 'View reports', 'Reports'),
  ('reports.export', 'Export reports', 'Reports')
on conflict (code) do update set
  name = excluded.name,
  category = excluded.category;

-- Owner receives every permission.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r cross join public.permissions p
where r.code = 'system_owner'
on conflict do nothing;

-- Manager receives operational administration except role-definition mutation.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code = any(array[
  'users.read','users.create','users.update','users.suspend','users.assign_roles',
  'roles.read','classes.assign_users','responsibilities.manage',
  'members.read','members.update','member_follow_up.read','member_follow_up.write',
  'member_attendance.read','member_attendance.write',
  'servant_follow_up.read_own','servant_follow_up.read_assigned','servant_follow_up.read_all',
  'servant_follow_up.record','evaluations.read_own','evaluations.read_assigned',
  'evaluations.manage','tasks.read_own','tasks.update_own','tasks.assign','tasks.manage',
  'audit.read','settings.manage','reports.read','reports.export'
])
where r.code = 'system_manager'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code = any(array[
  'users.read','classes.assign_users','responsibilities.manage','members.read',
  'members.update','member_follow_up.read','member_follow_up.write',
  'member_attendance.read','member_attendance.write',
  'servant_follow_up.read_own','servant_follow_up.read_assigned',
  'servant_follow_up.record','evaluations.read_own','evaluations.read_assigned',
  'evaluations.manage','tasks.read_own','tasks.update_own','tasks.assign',
  'reports.read','reports.export'
])
where r.code = 'main_servant'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code = any(array[
  'members.read','member_follow_up.read','member_follow_up.write',
  'member_attendance.read','member_attendance.write',
  'servant_follow_up.read_own','evaluations.read_own',
  'tasks.read_own','tasks.update_own','reports.read'
])
where r.code = 'servant'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code = any(array[
  'users.read','members.read','member_attendance.read','member_attendance.write',
  'servant_follow_up.read_own','evaluations.read_own',
  'tasks.read_own','tasks.update_own','reports.read','reports.export'
])
where r.code = 'secretary'
on conflict do nothing;

insert into public.role_assignment_policies (grantor_role_id, grantable_role_id)
select owner.id, target.id
from public.roles owner cross join public.roles target
where owner.code = 'system_owner'
on conflict do nothing;

insert into public.role_assignment_policies (grantor_role_id, grantable_role_id)
select manager.id, target.id
from public.roles manager cross join public.roles target
where manager.code = 'system_manager'
  and target.code in ('main_servant','servant','secretary')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Responsibilities and organizational assignments
-- ---------------------------------------------------------------------------

create table if not exists public.user_class_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  assignment_type text not null default 'servant',
  is_primary boolean not null default false,
  starts_on date not null default current_date,
  ends_on date,
  assigned_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, group_id, assignment_type, starts_on),
  check (ends_on is null or ends_on >= starts_on)
);

create table if not exists public.responsibilities (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.user_responsibilities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  responsibility_id uuid not null references public.responsibilities(id) on delete restrict,
  group_id uuid references public.groups(id) on delete cascade,
  notes text not null default '',
  starts_on date not null default current_date,
  ends_on date,
  assigned_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, responsibility_id, group_id, starts_on),
  check (ends_on is null or ends_on >= starts_on)
);

create table if not exists public.user_supervision (
  leader_user_id uuid not null references public.users(id) on delete cascade,
  supervised_user_id uuid not null references public.users(id) on delete cascade,
  starts_on date not null default current_date,
  ends_on date,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (leader_user_id, supervised_user_id, starts_on),
  check (leader_user_id <> supervised_user_id),
  check (ends_on is null or ends_on >= starts_on)
);

create table if not exists public.user_member_assignments (
  user_id uuid not null references public.users(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  responsibility_type text not null default 'follow_up',
  starts_on date not null default current_date,
  ends_on date,
  assigned_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, member_id, responsibility_type, starts_on),
  check (ends_on is null or ends_on >= starts_on)
);

create index if not exists idx_user_class_assignments_user on public.user_class_assignments(user_id);
create index if not exists idx_user_class_assignments_group on public.user_class_assignments(group_id);
create index if not exists idx_user_supervision_subject on public.user_supervision(supervised_user_id);
create index if not exists idx_user_member_assignments_member on public.user_member_assignments(member_id);

insert into public.responsibilities (code, name, description)
values
  ('class_coordination', 'Class coordination', 'Coordinates a class and its servants'),
  ('member_follow_up', 'Member follow-up', 'Follows up assigned Members'),
  ('attendance_recording', 'Attendance recording', 'Records service attendance'),
  ('lesson_preparation', 'Lesson preparation', 'Prepares assigned lessons'),
  ('servant_follow_up', 'Servant follow-up', 'Follows up supervised servants')
on conflict (code) do update set name = excluded.name, description = excluded.description;

-- ---------------------------------------------------------------------------
-- Tasks
-- ---------------------------------------------------------------------------

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  status text not null default 'open'
    check (status in ('open','in_progress','completed','cancelled')),
  priority text not null default 'normal'
    check (priority in ('low','normal','high','urgent')),
  due_at timestamptz,
  group_id uuid references public.groups(id) on delete set null,
  created_by uuid not null references public.users(id) on delete restrict,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'completed' and completed_at is not null) or status <> 'completed')
);

create table if not exists public.task_assignees (
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  assigned_by uuid not null references public.users(id) on delete restrict,
  assigned_at timestamptz not null default now(),
  primary key (task_id, user_id)
);

create table if not exists public.task_status_history (
  id bigint generated always as identity primary key,
  task_id uuid not null references public.tasks(id) on delete cascade,
  previous_status text,
  new_status text not null,
  changed_by uuid not null references public.users(id) on delete restrict,
  changed_at timestamptz not null default now(),
  notes text not null default ''
);

create index if not exists idx_tasks_status_due on public.tasks(status, due_at);
create index if not exists idx_task_assignees_user on public.task_assignees(user_id);

-- ---------------------------------------------------------------------------
-- Servant follow-up (strictly separate from Member attendance)
-- ---------------------------------------------------------------------------

create table if not exists public.servant_event_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.servant_event_types (code, name)
values
  ('liturgy', 'Liturgy attendance'),
  ('friday_service', 'Friday service attendance')
on conflict (code) do update set name = excluded.name;

create table if not exists public.servant_follow_up_sessions (
  id uuid primary key default gen_random_uuid(),
  event_type_id uuid not null references public.servant_event_types(id) on delete restrict,
  session_date date not null,
  group_id uuid references public.groups(id) on delete set null,
  title text not null default '',
  created_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (event_type_id, session_date, group_id)
);

create table if not exists public.servant_attendance_records (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.servant_follow_up_sessions(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'not_recorded'
    check (status in ('present','absent','excused','not_recorded')),
  notes text not null default '',
  recorded_by uuid not null references public.users(id) on delete restrict,
  recorded_at timestamptz not null default now(),
  unique (session_id, user_id)
);

create table if not exists public.lesson_preparations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  lesson_date date not null,
  title text not null default '',
  status text not null default 'pending'
    check (status in ('pending','prepared','reviewed','missed')),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references public.users(id) on delete set null,
  score numeric(5,2) check (score is null or (score >= 0 and score <= 100)),
  feedback text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, group_id, lesson_date)
);

create table if not exists public.user_follow_up_notes (
  id uuid primary key default gen_random_uuid(),
  subject_user_id uuid not null references public.users(id) on delete cascade,
  author_user_id uuid not null references public.users(id) on delete restrict,
  category text not null default 'general',
  visibility text not null default 'leaders'
    check (visibility in ('private','leaders','subject_and_leaders','management')),
  title text not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_servant_sessions_date on public.servant_follow_up_sessions(session_date desc);
create index if not exists idx_servant_attendance_user on public.servant_attendance_records(user_id);
create index if not exists idx_lesson_preparations_user_date on public.lesson_preparations(user_id, lesson_date desc);
create index if not exists idx_user_follow_up_notes_subject on public.user_follow_up_notes(subject_user_id);

-- ---------------------------------------------------------------------------
-- Monthly evaluations
-- ---------------------------------------------------------------------------

create table if not exists public.evaluation_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  version integer not null default 1,
  active boolean not null default true,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (name, version)
);

create table if not exists public.evaluation_criteria (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.evaluation_templates(id) on delete cascade,
  code text not null,
  name text not null,
  description text not null default '',
  weight numeric(6,3) not null default 1 check (weight > 0),
  max_score numeric(6,2) not null default 100 check (max_score > 0),
  sort_order integer not null default 0,
  unique (template_id, code)
);

create table if not exists public.evaluation_periods (
  id uuid primary key default gen_random_uuid(),
  year integer not null check (year between 2000 and 2200),
  month integer not null check (month between 1 and 12),
  starts_on date not null,
  ends_on date not null,
  status text not null default 'open' check (status in ('open','closed')),
  created_at timestamptz not null default now(),
  unique (year, month),
  check (ends_on >= starts_on)
);

create table if not exists public.user_evaluations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete restrict,
  evaluator_user_id uuid not null references public.users(id) on delete restrict,
  period_id uuid not null references public.evaluation_periods(id) on delete restrict,
  template_id uuid not null references public.evaluation_templates(id) on delete restrict,
  status text not null default 'draft' check (status in ('draft','finalized','corrected')),
  qualitative_summary text not null default '',
  automatic_score numeric(6,2),
  final_score numeric(6,2),
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, period_id, template_id),
  check (automatic_score is null or (automatic_score >= 0 and automatic_score <= 100)),
  check (final_score is null or (final_score >= 0 and final_score <= 100)),
  check ((status = 'finalized' and finalized_at is not null) or status <> 'finalized')
);

create table if not exists public.evaluation_scores (
  evaluation_id uuid not null references public.user_evaluations(id) on delete cascade,
  criterion_id uuid not null references public.evaluation_criteria(id) on delete restrict,
  score numeric(6,2) not null check (score >= 0),
  notes text not null default '',
  primary key (evaluation_id, criterion_id)
);

create index if not exists idx_user_evaluations_user_period on public.user_evaluations(user_id, period_id);

-- ---------------------------------------------------------------------------
-- Login history and immutable application audit
-- ---------------------------------------------------------------------------

create table if not exists public.user_login_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users(id) on delete restrict,
  occurred_at timestamptz not null default now(),
  success boolean not null,
  ip_address inet,
  user_agent text,
  failure_reason text
);

create table if not exists public.app_audit_logs (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  actor_user_id uuid references public.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  before_data jsonb,
  after_data jsonb,
  request_id uuid,
  ip_address inet,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_login_events_user_time on public.user_login_events(user_id, occurred_at desc);
create index if not exists idx_audit_actor_time on public.app_audit_logs(actor_user_id, occurred_at desc);
create index if not exists idx_audit_entity on public.app_audit_logs(entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- Timestamps, authorization helpers, and compatibility
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at before update on public.users
for each row execute function public.set_updated_at();

drop trigger if exists roles_set_updated_at on public.roles;
create trigger roles_set_updated_at before update on public.roles
for each row execute function public.set_updated_at();

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at before update on public.tasks
for each row execute function public.set_updated_at();

drop trigger if exists lesson_preparations_set_updated_at on public.lesson_preparations;
create trigger lesson_preparations_set_updated_at before update on public.lesson_preparations
for each row execute function public.set_updated_at();

drop trigger if exists user_notes_set_updated_at on public.user_follow_up_notes;
create trigger user_notes_set_updated_at before update on public.user_follow_up_notes
for each row execute function public.set_updated_at();

drop trigger if exists user_evaluations_set_updated_at on public.user_evaluations;
create trigger user_evaluations_set_updated_at before update on public.user_evaluations
for each row execute function public.set_updated_at();

create or replace function public.has_permission(requested_permission text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    join public.account_statuses s on s.code = u.status_code and s.allows_login
    join public.user_roles ur on ur.user_id = u.id
      and ur.starts_at <= now()
      and (ur.ends_at is null or ur.ends_at > now())
    join public.roles r on r.id = ur.role_id and r.active
    join public.role_permissions rp on rp.role_id = r.id
    join public.permissions p on p.id = rp.permission_id
    where u.id = auth.uid() and p.code = requested_permission
  );
$$;

create or replace function public.has_role(requested_role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    join public.account_statuses s on s.code = u.status_code and s.allows_login
    join public.user_roles ur on ur.user_id = u.id
      and ur.starts_at <= now()
      and (ur.ends_at is null or ur.ends_at > now())
    join public.roles r on r.id = ur.role_id and r.active
    where u.id = auth.uid() and r.code = requested_role
  );
$$;

create or replace function public.can_assign_role(target_role uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_permission('users.assign_roles')
    and exists (
      select 1
      from public.user_roles ur
      join public.role_assignment_policies rap on rap.grantor_role_id = ur.role_id
      where ur.user_id = auth.uid()
        and rap.grantable_role_id = target_role
        and ur.starts_at <= now()
        and (ur.ends_at is null or ur.ends_at > now())
    );
$$;

create or replace function public.can_follow_up_user(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_user = auth.uid()
    or public.has_permission('servant_follow_up.read_all')
    or (
      public.has_permission('servant_follow_up.read_assigned')
      and exists (
        select 1 from public.user_supervision us
        where us.leader_user_id = auth.uid()
          and us.supervised_user_id = target_user
          and us.starts_on <= current_date
          and (us.ends_on is null or us.ends_on >= current_date)
      )
    );
$$;

create or replace function public.can_access_group(target_group uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('system_owner')
    or public.has_role('system_manager')
    or exists (
      select 1 from public.user_class_assignments a
      where a.user_id = auth.uid()
        and a.group_id = target_group
        and a.starts_on <= current_date
        and (a.ends_on is null or a.ends_on >= current_date)
    )
    -- Compatibility while legacy assignments are being retired.
    or exists (
      select 1 from public.group_servants gs
      where gs.user_id = auth.uid() and gs.group_id = target_group
    )
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('system_owner')
    or public.has_role('system_manager')
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;

  insert into public.users (id, full_name, contact_email, status_code)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    case when new.email_confirmed_at is null then 'pending_invitation' else 'active' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Backfill domain Users from existing profiles.
insert into public.users (id, full_name, contact_email, status_code, created_at)
select
  p.id,
  p.full_name,
  au.email,
  case when p.enabled then 'active' else 'suspended' end,
  p.created_at
from public.profiles p
join auth.users au on au.id = p.id
on conflict (id) do update set
  full_name = excluded.full_name,
  contact_email = coalesce(public.users.contact_email, excluded.contact_email);

-- First existing admin becomes owner; other admins become managers.
with ranked_admins as (
  select p.id, row_number() over (order by p.created_at, p.id) as position
  from public.profiles p
  where p.role = 'admin'
)
insert into public.user_roles (user_id, role_id)
select ra.id, r.id
from ranked_admins ra
join public.roles r on r.code = case when ra.position = 1 then 'system_owner' else 'system_manager' end
on conflict do nothing;

insert into public.user_roles (user_id, role_id)
select p.id, r.id
from public.profiles p
join public.roles r on r.code = case p.role::text
  when 'class_leader' then 'main_servant'
  when 'secretary' then 'secretary'
  else 'servant'
end
where p.role::text <> 'admin'
on conflict do nothing;

insert into public.user_class_assignments (user_id, group_id, assignment_type)
select gs.user_id, gs.group_id, 'servant'
from public.group_servants gs
join public.users u on u.id = gs.user_id
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Statistics views
-- ---------------------------------------------------------------------------

create or replace view public.user_monthly_follow_up_statistics
with (security_invoker = true)
as
with activity_months as (
  select sar.user_id, date_trunc('month', sfs.session_date)::date as month_start
  from public.servant_attendance_records sar
  join public.servant_follow_up_sessions sfs on sfs.id = sar.session_id
  union
  select lp.user_id, date_trunc('month', lp.lesson_date)::date
  from public.lesson_preparations lp
  union
  select ta.user_id, date_trunc('month', t.created_at)::date
  from public.task_assignees ta
  join public.tasks t on t.id = ta.task_id
),
attendance as (
  select sar.user_id, date_trunc('month', sfs.session_date)::date as month_start,
    count(*) filter (where sety.code = 'liturgy') as liturgy_records,
    count(*) filter (where sety.code = 'liturgy' and sar.status = 'present') as liturgy_present,
    count(*) filter (where sety.code = 'friday_service') as friday_records,
    count(*) filter (where sety.code = 'friday_service' and sar.status = 'present') as friday_present
  from public.servant_attendance_records sar
  join public.servant_follow_up_sessions sfs on sfs.id = sar.session_id
  join public.servant_event_types sety on sety.id = sfs.event_type_id
  group by sar.user_id, date_trunc('month', sfs.session_date)
),
lessons as (
  select lp.user_id, date_trunc('month', lp.lesson_date)::date as month_start,
    count(*) as lesson_records,
    count(*) filter (where lp.status in ('prepared','reviewed')) as lessons_prepared
  from public.lesson_preparations lp
  group by lp.user_id, date_trunc('month', lp.lesson_date)
),
task_totals as (
  select ta.user_id, date_trunc('month', t.created_at)::date as month_start,
    count(*) as assigned_tasks,
    count(*) filter (where t.status = 'completed') as completed_tasks
  from public.task_assignees ta
  join public.tasks t on t.id = ta.task_id
  group by ta.user_id, date_trunc('month', t.created_at)
)
select
  u.id as user_id,
  u.full_name,
  m.month_start,
  coalesce(a.liturgy_records, 0) as liturgy_records,
  coalesce(a.liturgy_present, 0) as liturgy_present,
  coalesce(a.friday_records, 0) as friday_records,
  coalesce(a.friday_present, 0) as friday_present,
  coalesce(l.lesson_records, 0) as lesson_records,
  coalesce(l.lessons_prepared, 0) as lessons_prepared,
  coalesce(tt.assigned_tasks, 0) as assigned_tasks,
  coalesce(tt.completed_tasks, 0) as completed_tasks,
  round(100.0 * (coalesce(a.liturgy_present, 0) + coalesce(a.friday_present, 0))
    / nullif(coalesce(a.liturgy_records, 0) + coalesce(a.friday_records, 0), 0), 2) as attendance_rate,
  round(100.0 * coalesce(l.lessons_prepared, 0) / nullif(coalesce(l.lesson_records, 0), 0), 2)
    as lesson_preparation_rate,
  round(100.0 * coalesce(tt.completed_tasks, 0) / nullif(coalesce(tt.assigned_tasks, 0), 0), 2)
    as task_completion_rate
from activity_months m
join public.users u on u.id = m.user_id
left join attendance a on a.user_id = m.user_id and a.month_start = m.month_start
left join lessons l on l.user_id = m.user_id and l.month_start = m.month_start
left join task_totals tt on tt.user_id = m.user_id and tt.month_start = m.month_start;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.account_statuses enable row level security;
alter table public.users enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles enable row level security;
alter table public.role_assignment_policies enable row level security;
alter table public.user_class_assignments enable row level security;
alter table public.responsibilities enable row level security;
alter table public.user_responsibilities enable row level security;
alter table public.user_supervision enable row level security;
alter table public.user_member_assignments enable row level security;
alter table public.tasks enable row level security;
alter table public.task_assignees enable row level security;
alter table public.task_status_history enable row level security;
alter table public.servant_event_types enable row level security;
alter table public.servant_follow_up_sessions enable row level security;
alter table public.servant_attendance_records enable row level security;
alter table public.lesson_preparations enable row level security;
alter table public.user_follow_up_notes enable row level security;
alter table public.evaluation_templates enable row level security;
alter table public.evaluation_criteria enable row level security;
alter table public.evaluation_periods enable row level security;
alter table public.user_evaluations enable row level security;
alter table public.evaluation_scores enable row level security;
alter table public.user_login_events enable row level security;
alter table public.app_audit_logs enable row level security;

create policy "reference account statuses readable" on public.account_statuses
for select to authenticated using (true);
create policy "users readable by self or managers" on public.users
for select to authenticated
using (id = auth.uid() or public.has_permission('users.read'));
create policy "roles readable" on public.roles
for select to authenticated using (public.has_permission('roles.read') or exists (
  select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role_id = roles.id
));
create policy "permissions readable" on public.permissions
for select to authenticated using (public.has_permission('roles.read'));
create policy "role permissions readable" on public.role_permissions
for select to authenticated using (public.has_permission('roles.read'));
create policy "user roles readable" on public.user_roles
for select to authenticated using (user_id = auth.uid() or public.has_permission('users.read'));
create policy "assignment policies readable" on public.role_assignment_policies
for select to authenticated using (public.has_permission('roles.read'));
create policy "class assignments readable" on public.user_class_assignments
for select to authenticated using (
  user_id = auth.uid() or public.has_permission('users.read') or public.can_access_group(group_id)
);
create policy "responsibilities readable" on public.responsibilities
for select to authenticated using (true);
create policy "user responsibilities readable" on public.user_responsibilities
for select to authenticated using (user_id = auth.uid() or public.has_permission('users.read'));
create policy "supervision readable" on public.user_supervision
for select to authenticated using (
  leader_user_id = auth.uid() or supervised_user_id = auth.uid() or public.has_permission('users.read')
);
create policy "member assignments readable" on public.user_member_assignments
for select to authenticated using (
  user_id = auth.uid() or public.has_permission('users.read') or public.can_access_group(
    (select m.group_id from public.members m where m.id = member_id)
  )
);
create policy "tasks readable by participants" on public.tasks
for select to authenticated using (
  created_by = auth.uid()
  or public.has_permission('tasks.manage')
  or exists (select 1 from public.task_assignees ta where ta.task_id = tasks.id and ta.user_id = auth.uid())
);
create policy "task assignees readable" on public.task_assignees
for select to authenticated using (
  user_id = auth.uid()
  or assigned_by = auth.uid()
  or public.has_permission('tasks.manage')
);
create policy "task history readable" on public.task_status_history
for select to authenticated using (
  public.has_permission('tasks.manage')
  or exists (select 1 from public.task_assignees ta where ta.task_id = task_status_history.task_id and ta.user_id = auth.uid())
);
create policy "servant event types readable" on public.servant_event_types
for select to authenticated using (true);
create policy "follow up sessions readable" on public.servant_follow_up_sessions
for select to authenticated using (
  public.has_permission('servant_follow_up.read_all')
  or public.has_permission('servant_follow_up.read_assigned')
  or public.has_permission('servant_follow_up.read_own')
);
create policy "servant attendance readable by scope" on public.servant_attendance_records
for select to authenticated using (public.can_follow_up_user(user_id));
create policy "lesson preparation readable by scope" on public.lesson_preparations
for select to authenticated using (public.can_follow_up_user(user_id));
create policy "follow up notes readable by scope" on public.user_follow_up_notes
for select to authenticated using (
  public.can_follow_up_user(subject_user_id)
  and (
    visibility <> 'private'
    or author_user_id = auth.uid()
  )
);
create policy "evaluation templates readable" on public.evaluation_templates
for select to authenticated using (
  public.has_permission('evaluations.read_own')
  or public.has_permission('evaluations.read_assigned')
  or public.has_permission('evaluations.manage')
);
create policy "evaluation criteria readable" on public.evaluation_criteria
for select to authenticated using (
  public.has_permission('evaluations.read_own')
  or public.has_permission('evaluations.read_assigned')
  or public.has_permission('evaluations.manage')
);
create policy "evaluation periods readable" on public.evaluation_periods
for select to authenticated using (true);
create policy "evaluations readable by scope" on public.user_evaluations
for select to authenticated using (
  user_id = auth.uid()
  or public.can_follow_up_user(user_id)
  or public.has_permission('evaluations.manage')
);
create policy "evaluation scores readable by scope" on public.evaluation_scores
for select to authenticated using (
  exists (
    select 1 from public.user_evaluations ue
    where ue.id = evaluation_scores.evaluation_id
      and (ue.user_id = auth.uid() or public.can_follow_up_user(ue.user_id) or public.has_permission('evaluations.manage'))
  )
);
create policy "login events readable by owner or audit" on public.user_login_events
for select to authenticated using (user_id = auth.uid() or public.has_permission('audit.read'));
create policy "audit logs readable" on public.app_audit_logs
for select to authenticated using (public.has_permission('audit.read'));

-- ---------------------------------------------------------------------------
-- Avatar storage
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'user-avatars',
  'user-avatars',
  false,
  5242880,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "avatar owners and managers can read"
on storage.objects for select to authenticated
using (
  bucket_id = 'user-avatars'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.has_permission('users.read')
  )
);

create policy "avatar owners can upload"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'user-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "avatar owners can update"
on storage.objects for update to authenticated
using (
  bucket_id = 'user-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'user-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "avatar owners can delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'user-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

commit;
