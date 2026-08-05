import "server-only";

import { requireActiveActor } from "@/features/access-control/data/authorization-service";
import type { ChurchNotification, NotificationList } from "@/features/notifications/types/notification";
import {
  activeUserIds,
  dispatchNotifications,
  familyRecipientIds,
} from "@/features/notifications/data/notification-repository";
import { getAdminClient } from "@/infrastructure/supabase/admin-client";

const SELECT = "id,recipient_user_id,type,title,message,related_entity_type,related_entity_id,family_id,target_url,created_by,created_at,read_at,is_read,event_count";
const isAdministrator = (roles: string[]) =>
  roles.includes("system_owner") || roles.includes("system_manager");

const mapNotification = (row: Record<string, unknown>): ChurchNotification => ({
  id: String(row.id), recipientUserId: String(row.recipient_user_id),
  type: String(row.type) as ChurchNotification["type"], title: String(row.title),
  message: String(row.message), relatedEntityType: String(row.related_entity_type),
  relatedEntityId: row.related_entity_id ? String(row.related_entity_id) : null,
  familyId: row.family_id ? String(row.family_id) : null, targetUrl: String(row.target_url),
  createdBy: row.created_by ? String(row.created_by) : null, createdAt: String(row.created_at),
  readAt: row.read_at ? String(row.read_at) : null, isRead: Boolean(row.is_read),
  eventCount: Number(row.event_count),
});

export async function listNotifications(options: { all?: boolean; limit?: number } = {}): Promise<NotificationList> {
  const actor = await requireActiveActor();
  const all = Boolean(options.all && isAdministrator(actor.roles));
  let query = getAdminClient().from("notifications").select(SELECT)
    .is("archived_at", null).order("created_at", { ascending: false }).limit(options.limit || 50);
  if (!all) query = query.eq("recipient_user_id", actor.id);
  const { data, error } = await query;
  if (error) throw error;
  const notifications = (data || []).map((row) => mapNotification(row));
  return { notifications, unreadCount: notifications.filter((item) => !item.isRead).length };
}

export async function markNotificationRead(id: string) {
  const actor = await requireActiveActor();
  const { data, error } = await getAdminClient().from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", id).eq("recipient_user_id", actor.id).select(SELECT).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("الإشعار غير موجود.");
  return mapNotification(data);
}

export async function markAllNotificationsRead() {
  const actor = await requireActiveActor();
  const { error } = await getAdminClient().from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("recipient_user_id", actor.id).eq("is_read", false).is("archived_at", null);
  if (error) throw error;
}

export async function notifyVisitationRecorded(input: {
  actorId: string; actorName: string; memberId: string; visitationTypeId: string;
}) {
  const admin = getAdminClient();
  const [{ data: member, error: memberError }, { data: type, error: typeError }] = await Promise.all([
    admin.from("members").select("id,full_name,group_id,groups(name)").eq("id", input.memberId).single(),
    admin.from("visitation_types").select("code,name_ar").eq("id", input.visitationTypeId).single(),
  ]);
  if (memberError) throw memberError;
  if (typeError) throw typeError;
  const family = member.groups as unknown as { name: string } | null;
  const recipients = await familyRecipientIds(member.group_id);
  const kind = type.code === "home" ? "الافتقاد المنزلي" : "الافتقاد التليفوني";
  await dispatchNotifications({
    recipientIds: recipients, type: "SUCCESS", title: `تم تسجيل ${kind}`,
    message: `${input.actorName} سجّل ${kind} للمخدوم ${member.full_name}.`,
    relatedEntityType: "member", relatedEntityId: member.id, familyId: member.group_id,
    targetUrl: `/dashboard/member/${member.id}`, createdBy: input.actorId,
    groupingKey: `visitation:${member.group_id}:${type.code}`,
    groupedMessage: `${input.actorName} سجّل {count} تحديثات ${kind} لأسرة ${family?.name || "الخدمة"}.`,
  });
}

export async function notifyAnnouncementEvent(input: {
  actorId: string; actorName: string; announcementId: string; title: string; event: "published" | "updated";
}) {
  const recipients = await activeUserIds();
  await dispatchNotifications({
    recipientIds: recipients, type: input.event === "published" ? "IMPORTANT" : "INFO",
    title: input.event === "published" ? "إعلان جديد" : "تم تحديث إعلان",
    message: `${input.actorName} ${input.event === "published" ? "نشر" : "حدّث"} الإعلان «${input.title}».`,
    relatedEntityType: "announcement", relatedEntityId: input.announcementId, familyId: null,
    targetUrl: `/dashboard/announcements#announcement-${input.announcementId}`, createdBy: input.actorId,
    groupingKey: `announcement:${input.announcementId}:${input.event}`,
    groupedMessage: `تم تحديث الإعلان «${input.title}» {count} مرات خلال فترة قصيرة.`,
  });
}

const absenceStatus = (count: number) => count >= 3 ? "danger" : count === 2 ? "critical" : count === 1 ? "important" : "regular";

export async function notifyAttendanceSubmitted(sessionId: string, actorId: string, actorName: string) {
  const admin = getAdminClient();
  const { data: records, error } = await admin.from("attendance_records")
    .select("member_id,updated_by,members!inner(id,full_name,group_id,groups(name))")
    .eq("session_id", sessionId);
  if (error) throw error;
  if (!(records || []).some((row) => row.updated_by === actorId)) throw new Error("لا يمكن إرسال إشعار لهذا التسليم.");

  const byFamily = new Map<string, { name: string; count: number }>();
  for (const row of records || []) {
    const member = row.members as unknown as { id: string; full_name: string; group_id: string; groups: { name: string } | null };
    const current = byFamily.get(member.group_id) || { name: member.groups?.name || "الخدمة", count: 0 };
    current.count += 1; byFamily.set(member.group_id, current);
  }
  for (const [familyId, family] of byFamily) {
    await dispatchNotifications({
      recipientIds: await familyRecipientIds(familyId), type: "SUCCESS", title: "تم تسليم حضور الأسرة",
      message: `${actorName} قام بتسجيل حضور ${family.count} مخدومًا من أسرة ${family.name}.`,
      relatedEntityType: "attendance_session", relatedEntityId: sessionId, familyId,
      targetUrl: "/dashboard/attendance", createdBy: actorId,
      groupingKey: `attendance:${sessionId}:${familyId}`,
      groupedMessage: `${actorName} قام بتحديث حضور الأسرة {count} مرات خلال فترة قصيرة.`,
    });
  }

  const memberIds = (records || []).map((row) => row.member_id);
  if (!memberIds.length) return;
  const { data: sessions, error: sessionsError } = await admin.from("attendance_sessions")
    .select("id,attendance_date").order("attendance_date", { ascending: false });
  if (sessionsError) throw sessionsError;
  const sessionIds = (sessions || []).map((item) => item.id);
  const { data: history, error: historyError } = await admin.from("attendance_records")
    .select("member_id,session_id,service_attended").in("member_id", memberIds).in("session_id", sessionIds);
  if (historyError) throw historyError;
  const dateBySession = new Map((sessions || []).map((item) => [item.id, item.attendance_date]));
  for (const row of records || []) {
    const member = row.members as unknown as { id: string; full_name: string; group_id: string };
    const ordered = (history || []).filter((item) => item.member_id === member.id)
      .sort((a, b) => String(dateBySession.get(b.session_id)).localeCompare(String(dateBySession.get(a.session_id))));
    let absences = 0;
    for (const item of ordered) { if (item.service_attended) break; absences += 1; }
    const status = absenceStatus(absences);
    const previous = await admin.from("member_notification_states").select("absence_status").eq("member_id", member.id).maybeSingle();
    if (previous.error) throw previous.error;
    await admin.from("member_notification_states").upsert({ member_id: member.id, absence_status: status, updated_at: new Date().toISOString() });
    if (previous.data?.absence_status !== status && (status === "danger" || status === "critical")) {
      await dispatchNotifications({
        recipientIds: await familyRecipientIds(member.group_id), type: status === "danger" ? "IMPORTANT" : "WARNING",
        title: status === "danger" ? "حالة افتقاد: خطر" : "حالة افتقاد: حرج",
        message: `تغيّرت حالة المخدوم ${member.full_name} إلى ${status === "danger" ? "خطر" : "حرج"}.`,
        relatedEntityType: "member", relatedEntityId: member.id, familyId: member.group_id,
        targetUrl: `/dashboard/member/${member.id}`, createdBy: actorId,
        groupingKey: `member-status:${member.id}:${status}`,
      });
    }
  }
}

export async function notifyMemberNote(input: {
  actorId: string; actorName: string; noteId: string; event: "created" | "updated";
}) {
  const admin = getAdminClient();
  const { data: note, error } = await admin.from("member_notes")
    .select("id,title,is_important,member_id,members!inner(full_name,group_id)").eq("id", input.noteId).single();
  if (error) throw error;
  if (input.event === "updated" && !note.is_important) return;
  const member = note.members as unknown as { full_name: string; group_id: string };
  await dispatchNotifications({
    recipientIds: await familyRecipientIds(member.group_id), type: note.is_important ? "IMPORTANT" : "INFO",
    title: input.event === "created" ? "ملاحظة جديدة للمخدوم" : "تم تحديث ملاحظة مهمة",
    message: `${input.actorName} ${input.event === "created" ? "أضاف" : "حدّث"} ملاحظة للمخدوم ${member.full_name}: ${note.title}.`,
    relatedEntityType: "member", relatedEntityId: note.member_id, familyId: member.group_id,
    targetUrl: `/dashboard/member/${note.member_id}`, createdBy: input.actorId,
    groupingKey: `member-note:${note.id}:${input.event}`,
  });
}
