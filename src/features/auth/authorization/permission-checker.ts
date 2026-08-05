import { UserAccount, Permission } from "../types/auth-types";
import { ALL_PERMISSIONS } from "./role-definitions";

export function hasPermission(user: UserAccount | null | undefined, permission: Permission): boolean {
  if (!user || !user.enabled) return false;
  if (user.role === "admin") return true;
  return (user.permissions || []).includes(permission);
}

export function filterGroupsForUser<T extends { id: number; name: string; active?: boolean }>(
  user: UserAccount | null | undefined,
  groups: T[]
): T[] {
  if (!user || !user.enabled) return [];
  if (user.role === "admin" || !user.assignedGroups || user.assignedGroups.length === 0) {
    return groups;
  }
  return groups.filter(g => user.assignedGroups.includes(g.name));
}

export function filterMembersForUser<T extends { groupId: number; active?: boolean }>(
  user: UserAccount | null | undefined,
  members: T[],
  groups: { id: number; name: string }[]
): T[] {
  if (!user || !user.enabled) return [];
  if (user.role === "admin" || !user.assignedGroups || user.assignedGroups.length === 0) {
    return members;
  }
  const allowedGroupIds = groups
    .filter(g => user.assignedGroups.includes(g.name))
    .map(g => g.id);
  
  return members.filter(m => allowedGroupIds.includes(m.groupId));
}

export function filterSubmissionsForUser<T extends { records?: { memberId: number }[] }>(
  user: UserAccount | null | undefined,
  submissions: T[],
  members: { id: number; groupId: number }[],
  groups: { id: number; name: string }[]
): T[] {
  if (!user || !user.enabled) return [];
  if (user.role === "admin" || !user.assignedGroups || user.assignedGroups.length === 0) {
    return submissions;
  }
  const allowedMemberIds = new Set(
    filterMembersForUser(user, members, groups).map(m => m.id)
  );

  return submissions.map(sub => ({
    ...sub,
    records: (sub.records || []).filter(r => allowedMemberIds.has(r.memberId))
  }));
}
