import { createServerSupabaseClient } from "@/infrastructure/supabase/server-client";
import { getAdminClient } from "@/infrastructure/supabase/admin-client";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, isAdministratorSession } from "@/features/auth/data/administrator-session";
import {
  ALL_PERMISSION_CODES,
  AccountUnavailableError,
  AuthenticationRequiredError,
  PermissionDeniedError,
  type CurrentActor,
  type PermissionCode,
  type SystemRoleCode,
} from "@/features/access-control/types/access-control";

interface UserRoleRow {
  roles: { code: string } | null;
}

interface RolePermissionRow {
  roles: { code: string } | null;
  permissions: { code: string } | null;
}

export async function getCurrentActor(): Promise<CurrentActor | null> {
  const cookieStore = await cookies();
  if (await isAdministratorSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value)) {
    const admin = getAdminClient();
    const { data, error } = await admin.from("user_roles")
      .select("user_id, roles!inner(code), users!user_roles_user_id_fkey(full_name, photo_path, contact_email, status_code)")
      .eq("roles.code", "system_owner").eq("users.status_code", "active").limit(1).maybeSingle();
    if (error) throw error;
    const owner = data?.users as unknown as {
      full_name: string; photo_path: string | null; contact_email: string | null; status_code: string;
    } | null;
    if (!data || !owner) return null;
    return {
      id: data.user_id, email: owner.contact_email || "", fullName: owner.full_name || "مدير النظام",
      photoPath: owner.photo_path, status: owner.status_code,
      roles: ["system_owner", "system_manager"], permissions: [...ALL_PERMISSION_CODES], classIds: [],
    };
  }

  const sessionClient = await createServerSupabaseClient();
  const {
    data: { user: authUser },
  } = await sessionClient.auth.getUser();

  if (!authUser) return null;

  const admin = getAdminClient();
  const [userResult, rolesResult, permissionsResult, classesResult] = await Promise.all([
    admin
      .from("users")
      .select("id, full_name, photo_path, status_code")
      .eq("id", authUser.id)
      .maybeSingle(),
    admin.from("user_roles").select("roles(code)").eq("user_id", authUser.id),
    admin
      .from("user_roles")
      .select("roles(code, role_permissions(permissions(code)))")
      .eq("user_id", authUser.id),
    admin
      .from("user_class_assignments")
      .select("group_id")
      .eq("user_id", authUser.id)
      .lte("starts_on", new Date().toISOString().slice(0, 10))
      .or(`ends_on.is.null,ends_on.gte.${new Date().toISOString().slice(0, 10)}`),
  ]);

  if (userResult.error) throw userResult.error;
  if (!userResult.data) return null;

  const roles = ((rolesResult.data || []) as unknown as UserRoleRow[])
    .map((row) => row.roles?.code)
    .filter((code): code is SystemRoleCode => Boolean(code));

  const permissions = new Set<PermissionCode>();
  for (const row of (permissionsResult.data || []) as unknown as {
    roles: {
      code: string;
      role_permissions: { permissions: { code: PermissionCode } | null }[];
    } | null;
  }[]) {
    for (const link of row.roles?.role_permissions || []) {
      if (link.permissions?.code) permissions.add(link.permissions.code);
    }
  }

  return {
    id: authUser.id,
    email: authUser.email || "",
    fullName: userResult.data.full_name,
    photoPath: userResult.data.photo_path,
    status: userResult.data.status_code,
    roles,
    permissions: [...permissions],
    classIds: (classesResult.data || []).map((row) => row.group_id),
  };
}

export async function requireActiveActor(): Promise<CurrentActor> {
  const actor = await getCurrentActor();
  if (!actor) throw new AuthenticationRequiredError();
  if (actor.status !== "active") throw new AccountUnavailableError(actor.status);
  return actor;
}

export async function requirePermission(
  permission: PermissionCode,
): Promise<CurrentActor> {
  const actor = await requireActiveActor();
  if (!actor.permissions.includes(permission)) {
    throw new PermissionDeniedError(permission);
  }
  return actor;
}

export function actorHasPermission(
  actor: CurrentActor,
  permission: PermissionCode,
): boolean {
  return actor.permissions.includes(permission);
}

export async function canActorAssignRole(
  actor: CurrentActor,
  targetRoleId: string,
): Promise<boolean> {
  if (!actor.permissions.includes("users.assign_roles")) return false;
  const admin = getAdminClient();
  const { data: actorRoles, error: actorRolesError } = await admin
    .from("user_roles")
    .select("role_id")
    .eq("user_id", actor.id);
  if (actorRolesError) throw actorRolesError;
  if (!actorRoles?.length) return false;

  const { data, error } = await admin
    .from("role_assignment_policies")
    .select("grantor_role_id")
    .eq("grantable_role_id", targetRoleId)
    .in("grantor_role_id", actorRoles.map((row) => row.role_id))
    .limit(1);
  if (error) throw error;
  return Boolean(data?.length);
}

export async function canActorFollowUpUser(
  actor: CurrentActor,
  targetUserId: string,
): Promise<boolean> {
  if (actor.id === targetUserId) return true;
  if (actor.permissions.includes("servant_follow_up.read_all")) return true;
  if (!actor.permissions.includes("servant_follow_up.read_assigned")) return false;

  const admin = getAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await admin
    .from("user_supervision")
    .select("leader_user_id")
    .eq("leader_user_id", actor.id)
    .eq("supervised_user_id", targetUserId)
    .lte("starts_on", today)
    .or(`ends_on.is.null,ends_on.gte.${today}`)
    .limit(1);
  if (error) throw error;
  return Boolean(data?.length);
}

export function isAuthorizationError(
  error: unknown,
): error is AuthenticationRequiredError | AccountUnavailableError | PermissionDeniedError {
  return (
    error instanceof AuthenticationRequiredError ||
    error instanceof AccountUnavailableError ||
    error instanceof PermissionDeniedError
  );
}
