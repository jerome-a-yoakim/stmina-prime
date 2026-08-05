import "server-only";
import { getAdminClient } from "@/infrastructure/supabase/admin-client";
import {
  actorHasPermission,
  canActorAssignRole,
  requireActiveActor,
  requirePermission,
} from "@/features/access-control/data/authorization-service";
import { PermissionDeniedError } from "@/features/access-control/types/access-control";
import { writeAuditLog } from "@/features/audit/data/audit-service";
import {
  createUserSchema,
  updateUserSchema,
  type CreateUserInput,
  type UpdateUserInput,
} from "@/features/users/schemas/user-schema";

export async function listUsers() {
  await requirePermission("users.read");
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("users")
    .select(`
      id, full_name, photo_path, phone, contact_email, status_code, last_login_at, created_at,
      user_roles!user_roles_user_id_fkey(roles(id, code, name)),
      user_class_assignments!user_class_assignments_user_id_fkey(group_id, is_primary, groups(name)),
      user_responsibilities!user_responsibilities_user_id_fkey(responsibility_id, responsibilities(name))
    `)
    .order("full_name");
  if (error) throw error;
  return data || [];
}

export async function getUserProfile(userId: string) {
  const actor = await requireActiveActor();
  if (
    actor.id !== userId &&
    !actorHasPermission(actor, "users.read") &&
    !actorHasPermission(actor, "servant_follow_up.read_all") &&
    !actorHasPermission(actor, "servant_follow_up.read_assigned")
  ) throw new PermissionDeniedError("users.read");

  const admin = getAdminClient();
  const [user, stats] = await Promise.all([
    admin.from("users").select(`
      id, full_name, photo_path, phone, alternate_phone, contact_email, status_code,
      last_login_at, created_at,
      user_roles!user_roles_user_id_fkey(roles(id, code, name)),
      user_class_assignments!user_class_assignments_user_id_fkey(group_id, assignment_type, is_primary, groups(name)),
      user_responsibilities!user_responsibilities_user_id_fkey(notes, responsibilities(code, name), groups(name))
    `).eq("id", userId).single(),
    admin.from("user_monthly_follow_up_statistics").select("*")
      .eq("user_id", userId).order("month_start", { ascending: false }).limit(12),
  ]);
  if (user.error) throw user.error;
  if (stats.error) throw stats.error;
  return { ...user.data, statistics: stats.data || [] };
}

export async function createUser(input: CreateUserInput) {
  const actor = await requireActiveActor();
  if (!actor.roles.includes("system_manager")) {
    throw new PermissionDeniedError("users.create");
  }
  const parsed = createUserSchema.parse(input);
  for (const roleId of parsed.roleIds) {
    if (!(await canActorAssignRole(actor, roleId))) {
      throw new PermissionDeniedError("users.assign_roles");
    }
  }

  const admin = getAdminClient();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: parsed.email,
    password: parsed.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.fullName },
  });
  if (createError) throw createError;
  const userId = created.user.id;

  try {
    const { error: userError } = await admin.from("users").upsert({
      id: userId,
      full_name: parsed.fullName,
      phone: parsed.phone || null,
      contact_email: parsed.email,
      status_code: "active",
      must_change_password: false,
      created_by: actor.id,
    });
    if (userError) throw userError;

    const writes = [
      admin.from("user_roles").insert(parsed.roleIds.map((roleId) => ({
        user_id: userId, role_id: roleId, assigned_by: actor.id,
      }))),
      parsed.classIds.length
        ? admin.from("user_class_assignments").insert(parsed.classIds.map((groupId) => ({
          user_id: userId, group_id: groupId, assigned_by: actor.id,
        })))
        : Promise.resolve({ error: null }),
      parsed.responsibilityIds.length
        ? admin.from("user_responsibilities").insert(parsed.responsibilityIds.map(
          (responsibilityId) => ({
            user_id: userId, responsibility_id: responsibilityId, assigned_by: actor.id,
          }),
        ))
        : Promise.resolve({ error: null }),
    ];
    const results = await Promise.all(writes);
    const failed = results.find((result) => result.error);
    if (failed?.error) throw failed.error;
  } catch (error) {
    await admin.auth.admin.deleteUser(userId);
    throw error;
  }

  await writeAuditLog({
    actorUserId: actor.id,
    action: "user.created",
    entityType: "user",
    entityId: userId,
    afterData: { email: parsed.email, roleIds: parsed.roleIds, classIds: parsed.classIds },
  });
  return { id: userId, email: parsed.email, fullName: parsed.fullName, status: "active" };
}

export async function getUserManagementOptions() {
  const actor = await requirePermission("users.read");
  const admin = getAdminClient();
  const [roles, groups, responsibilities] = await Promise.all([
    admin.from("roles").select("id, code, name").in("code", [
      "system_manager", "service_coordinator", "servant",
    ]).eq("active", true).order("sort_order"),
    admin.from("groups").select("id, name").eq("active", true).order("name"),
    admin.from("responsibilities").select("id, code, name").eq("active", true).order("name"),
  ]);
  if (roles.error) throw roles.error;
  if (groups.error) throw groups.error;
  if (responsibilities.error) throw responsibilities.error;
  const assignableRoles = [];
  for (const role of roles.data || []) {
    if (await canActorAssignRole(actor, role.id)) assignableRoles.push(role);
  }
  return {
    roles: assignableRoles,
    groups: groups.data || [],
    responsibilities: responsibilities.data || [],
  };
}

export async function updateUser(userId: string, input: UpdateUserInput) {
  const actor = await requireActiveActor();
  const parsed = updateUserSchema.parse(input);
  const isSelfProfileOnly = actor.id === userId &&
    parsed.status === undefined &&
    parsed.roleId === undefined &&
    parsed.classIds === undefined &&
    parsed.responsibilityIds === undefined;
  if (!isSelfProfileOnly && !actorHasPermission(actor, "users.update")) {
    throw new PermissionDeniedError("users.update");
  }
  if (parsed.status === "suspended" && !actorHasPermission(actor, "users.suspend")) {
    throw new PermissionDeniedError("users.suspend");
  }

  const admin = getAdminClient();
  if (parsed.roleId !== undefined && !(await canActorAssignRole(actor, parsed.roleId))) {
    throw new PermissionDeniedError("users.assign_roles");
  }
  const { data: before, error: beforeError } = await admin.from("users")
    .select("*").eq("id", userId).single();
  if (beforeError) throw beforeError;
  const patch = {
    ...(parsed.fullName !== undefined && { full_name: parsed.fullName }),
    ...(parsed.phone !== undefined && { phone: parsed.phone }),
    ...(parsed.alternatePhone !== undefined && { alternate_phone: parsed.alternatePhone }),
    ...(parsed.contactEmail !== undefined && { contact_email: parsed.contactEmail }),
    ...(parsed.status !== undefined && {
      status_code: parsed.status,
      archived_at: parsed.status === "archived" ? new Date().toISOString() : null,
    }),
  };
  const { data, error } = await admin.from("users").update(patch)
    .eq("id", userId).select().single();
  if (error) throw error;
  if (parsed.roleId !== undefined) {
    const { error: removeRolesError } = await admin.from("user_roles").delete().eq("user_id", userId);
    if (removeRolesError) throw removeRolesError;
    const { error: addRoleError } = await admin.from("user_roles").insert({
      user_id: userId, role_id: parsed.roleId, assigned_by: actor.id,
    });
    if (addRoleError) throw addRoleError;
  }
  if (parsed.classIds !== undefined) {
    const { error: removeClassesError } = await admin.from("user_class_assignments")
      .delete().eq("user_id", userId);
    if (removeClassesError) throw removeClassesError;
    if (parsed.classIds.length) {
      const { error: addClassesError } = await admin.from("user_class_assignments").insert(
        parsed.classIds.map((groupId) => ({ user_id: userId, group_id: groupId, assigned_by: actor.id })),
      );
      if (addClassesError) throw addClassesError;
    }
  }
  if (parsed.responsibilityIds !== undefined) {
    const { error: removeResponsibilitiesError } = await admin.from("user_responsibilities")
      .delete().eq("user_id", userId);
    if (removeResponsibilitiesError) throw removeResponsibilitiesError;
    if (parsed.responsibilityIds.length) {
      const { error: addResponsibilitiesError } = await admin.from("user_responsibilities").insert(
        parsed.responsibilityIds.map((responsibilityId) => ({
          user_id: userId, responsibility_id: responsibilityId, assigned_by: actor.id,
        })),
      );
      if (addResponsibilitiesError) throw addResponsibilitiesError;
    }
  }
  await writeAuditLog({
    actorUserId: actor.id, action: "user.updated", entityType: "user",
    entityId: userId, beforeData: before, afterData: data,
  });
  return data;
}
