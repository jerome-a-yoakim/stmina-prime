import "server-only";

import { z } from "zod";
import { requireActiveActor } from "@/features/access-control/data/authorization-service";
import { PermissionDeniedError } from "@/features/access-control/types/access-control";
import { notifyMemberNote } from "@/features/notifications/data/notification-service";
import { getAdminClient } from "@/infrastructure/supabase/admin-client";

const noteSchema = z.object({
  memberId: z.string().uuid(), title: z.string().trim().min(1).max(160),
  content: z.string().trim().min(1).max(4000),
  category: z.enum(["General", "Spiritual", "Follow-up"]), isImportant: z.boolean().default(false),
});
const updateSchema = noteSchema.omit({ memberId: true }).partial().refine(
  (value) => Object.keys(value).length > 0, "لا توجد تغييرات للحفظ.",
);
const SELECT = "id,member_id,title,content,category,is_important,created_by,created_at,updated_at";

const canManageAll = (roles: string[]) => roles.includes("system_owner") || roles.includes("system_manager");
async function requireMemberAccess(memberId: string, write: boolean) {
  const actor = await requireActiveActor();
  const permission = write ? "member_follow_up.write" : "member_follow_up.read";
  if (!actor.permissions.includes(permission)) throw new PermissionDeniedError(permission);
  const admin = getAdminClient();
  const { data: member, error } = await admin.from("members").select("id,group_id").eq("id", memberId).maybeSingle();
  if (error) throw error;
  if (!member) throw new Error("المخدوم غير موجود.");
  if (!canManageAll(actor.roles) && !actor.classIds.includes(member.group_id)) {
    throw new PermissionDeniedError(permission);
  }
  return actor;
}

export async function listMemberNotes(memberId: string) {
  await requireMemberAccess(memberId, false);
  const { data, error } = await getAdminClient().from("member_notes").select(SELECT)
    .eq("member_id", memberId).order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createMemberNoteServer(input: unknown) {
  const parsed = noteSchema.parse(input);
  const actor = await requireMemberAccess(parsed.memberId, true);
  const { data, error } = await getAdminClient().from("member_notes").insert({
    member_id: parsed.memberId, title: parsed.title, content: parsed.content,
    category: parsed.category, is_important: parsed.isImportant,
    created_by: actor.id, updated_by: actor.id,
  }).select(SELECT).single();
  if (error) throw error;
  try {
    await notifyMemberNote({ actorId: actor.id, actorName: actor.fullName, noteId: data.id, event: "created" });
  } catch { /* Preserve the note write if notification delivery is temporarily unavailable. */ }
  return data;
}

export async function updateMemberNoteServer(id: string, input: unknown) {
  const parsed = updateSchema.parse(input);
  const admin = getAdminClient();
  const current = await admin.from("member_notes").select("member_id").eq("id", id).maybeSingle();
  if (current.error) throw current.error;
  if (!current.data) throw new Error("الملاحظة غير موجودة.");
  const actor = await requireMemberAccess(current.data.member_id, true);
  const patch: Record<string, unknown> = { updated_by: actor.id };
  if (parsed.title !== undefined) patch.title = parsed.title;
  if (parsed.content !== undefined) patch.content = parsed.content;
  if (parsed.category !== undefined) patch.category = parsed.category;
  if (parsed.isImportant !== undefined) patch.is_important = parsed.isImportant;
  const { data, error } = await admin.from("member_notes").update(patch).eq("id", id).select(SELECT).single();
  if (error) throw error;
  try {
    await notifyMemberNote({ actorId: actor.id, actorName: actor.fullName, noteId: id, event: "updated" });
  } catch { /* Preserve the note write if notification delivery is temporarily unavailable. */ }
  return data;
}

export async function deleteMemberNoteServer(id: string) {
  const admin = getAdminClient();
  const current = await admin.from("member_notes").select("member_id").eq("id", id).maybeSingle();
  if (current.error) throw current.error;
  if (!current.data) return;
  await requireMemberAccess(current.data.member_id, true);
  const { error } = await admin.from("member_notes").delete().eq("id", id);
  if (error) throw error;
}
