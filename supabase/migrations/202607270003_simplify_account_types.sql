-- Add the supported coordinator role and retire legacy roles from new assignment.
-- Existing user-role rows remain intact for backward compatibility.

begin;

insert into public.roles (code, name, description, protected, active, sort_order)
values (
  'service_coordinator',
  'Service Coordinator',
  'Coordinates service assignments, Members, attendance, and reporting',
  false,
  true,
  30
)
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  active = true,
  sort_order = excluded.sort_order;

insert into public.role_permissions (role_id, permission_id)
select coordinator.id, permission.id
from public.roles coordinator
join public.permissions permission on permission.code = any(array[
  'users.read','classes.assign_users','responsibilities.manage',
  'members.read','members.update','member_follow_up.read','member_follow_up.write',
  'member_attendance.read','member_attendance.write',
  'servant_follow_up.read_own','evaluations.read_own','evaluations.read_assigned',
  'evaluations.manage','tasks.read_own','tasks.update_own','tasks.assign',
  'reports.read','reports.export'
])
where coordinator.code = 'service_coordinator'
on conflict do nothing;

insert into public.role_assignment_policies (grantor_role_id, grantable_role_id)
select manager.id, target.id
from public.roles manager
join public.roles target on target.code in ('system_manager', 'service_coordinator', 'servant')
where manager.code = 'system_manager'
on conflict do nothing;

insert into public.role_assignment_policies (grantor_role_id, grantable_role_id)
select owner.id, coordinator.id
from public.roles owner
join public.roles coordinator on coordinator.code = 'service_coordinator'
where owner.code = 'system_owner'
on conflict do nothing;

-- These roles remain available to existing assignments but are hidden from
-- account creation and no longer considered assignable choices.
update public.roles
set active = false
where code in ('main_servant', 'secretary');

commit;
