import "server-only";

import { requireActiveActor } from "@/features/access-control/data/authorization-service";
import { getAdminClient } from "@/infrastructure/supabase/admin-client";

export interface ResponsibleServantAssignment {
  groupId: string;
  userId: string;
  name: string;
  isPrimary: boolean;
  assignmentType: string;
  roles: string[];
}

interface AssignmentRow {
  group_id: string;
  user_id: string;
  is_primary: boolean;
  assignment_type: string;
}

const SERVANT_ROLE_CODES = new Set([
  "servant",
  "main_servant",
  "service_coordinator",
  "secretary",
]);

/**
 * Read-only projection of Users-module assignments for the family hierarchy.
 * user_class_assignments remains the sole assignment source of truth.
 */
export async function listResponsibleServantAssignments(): Promise<ResponsibleServantAssignment[]> {
  const actor = await requireActiveActor();
  const admin = getAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const canReadEveryFamily = actor.roles.includes("system_owner") || actor.roles.includes("system_manager");

  let assignmentQuery = admin.from("user_class_assignments")
    .select("group_id, user_id, is_primary, assignment_type")
    .lte("starts_on", today)
    .or(`ends_on.is.null,ends_on.gte.${today}`);
  if (!canReadEveryFamily) {
    if (!actor.classIds.length) return [];
    assignmentQuery = assignmentQuery.in("group_id", actor.classIds);
  }

  const { data: assignmentData, error: assignmentError } = await assignmentQuery;
  if (assignmentError) throw assignmentError;
  const assignments = (assignmentData || []) as AssignmentRow[];
  if (!assignments.length) return [];

  const userIds = [...new Set(assignments.map((item) => item.user_id))];
  const [{ data: users, error: usersError }, { data: roleLinks, error: rolesError }] = await Promise.all([
    admin.from("users").select("id, full_name").in("id", userIds).eq("status_code", "active"),
    admin.from("user_roles").select("user_id, roles(code, active)")
      .in("user_id", userIds)
      .lte("starts_at", new Date().toISOString())
      .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`),
  ]);
  if (usersError) throw usersError;
  if (rolesError) throw rolesError;

  const names = new Map((users || []).map((user) => [user.id, user.full_name]));
  const rolesByUser = new Map<string, string[]>();
  for (const link of (roleLinks || []) as unknown as { user_id: string; roles: { code: string; active: boolean } | null }[]) {
    if (!link.roles?.active) continue;
    const current = rolesByUser.get(link.user_id) || [];
    current.push(link.roles.code);
    rolesByUser.set(link.user_id, current);
  }

  const projected = assignments.flatMap((assignment) => {
    const name = names.get(assignment.user_id);
    const roles = rolesByUser.get(assignment.user_id) || [];
    if (!name || !roles.some((role) => SERVANT_ROLE_CODES.has(role))) return [];
    return [{
      groupId: assignment.group_id,
      userId: assignment.user_id,
      name,
      isPrimary: assignment.is_primary,
      assignmentType: assignment.assignment_type,
      roles,
    }];
  });
  const uniqueAssignments = new Map<string, ResponsibleServantAssignment>();
  for (const assignment of projected) {
    const key = `${assignment.groupId}:${assignment.userId}`;
    const existing = uniqueAssignments.get(key);
    if (!existing || assignment.isPrimary) uniqueAssignments.set(key, assignment);
  }
  return [...uniqueAssignments.values()]
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.name.localeCompare(b.name, "ar"));
}
