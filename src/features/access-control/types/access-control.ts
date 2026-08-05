export type PermissionCode =
  | "users.read"
  | "users.create"
  | "users.update"
  | "users.suspend"
  | "users.assign_roles"
  | "roles.read"
  | "roles.manage"
  | "classes.assign_users"
  | "responsibilities.manage"
  | "members.read"
  | "members.update"
  | "member_follow_up.read"
  | "member_follow_up.write"
  | "member_attendance.read"
  | "member_attendance.write"
  | "servant_follow_up.read_own"
  | "servant_follow_up.read_assigned"
  | "servant_follow_up.read_all"
  | "servant_follow_up.record"
  | "evaluations.read_own"
  | "evaluations.read_assigned"
  | "evaluations.manage"
  | "announcements.read"
  | "announcements.manage"
  | "audit.read"
  | "settings.manage"
  | "reports.read"
  | "reports.export";

export const ALL_PERMISSION_CODES: PermissionCode[] = [
  "users.read", "users.create", "users.update", "users.suspend", "users.assign_roles",
  "roles.read", "roles.manage", "classes.assign_users", "responsibilities.manage",
  "members.read", "members.update", "member_follow_up.read", "member_follow_up.write",
  "member_attendance.read", "member_attendance.write", "servant_follow_up.read_own",
  "servant_follow_up.read_assigned", "servant_follow_up.read_all", "servant_follow_up.record",
  "evaluations.read_own", "evaluations.read_assigned", "evaluations.manage",
  "announcements.read", "announcements.manage", "audit.read", "settings.manage",
  "reports.read", "reports.export",
];

export type SystemRoleCode =
  | "system_owner"
  | "system_manager"
  | "service_coordinator"
  | "main_servant"
  | "servant"
  | "secretary";

export interface CurrentActor {
  id: string;
  email: string;
  fullName: string;
  photoPath: string | null;
  status: string;
  roles: SystemRoleCode[];
  permissions: PermissionCode[];
  classIds: string[];
}

export class AuthenticationRequiredError extends Error {
  readonly status = 401;

  constructor() {
    super("Authentication required");
  }
}

export class AccountUnavailableError extends Error {
  readonly status = 403;

  constructor(status: string) {
    super(`Account is not active: ${status}`);
  }
}

export class PermissionDeniedError extends Error {
  readonly status = 403;

  constructor(permission: PermissionCode) {
    super(`Missing permission: ${permission}`);
  }
}
