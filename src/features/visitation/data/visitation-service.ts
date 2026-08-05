import "server-only";

import { requireActiveActor } from "@/features/access-control/data/authorization-service";
import { PermissionDeniedError } from "@/features/access-control/types/access-control";
import { createVisitationSchema } from "@/features/visitation/schemas/visitation-schema";
import type {
  AbsenceStatus,
  ServiceWeek,
  VisitationDashboardData,
  VisitationRecord,
  VisitationType,
} from "@/features/visitation/types/visitation";
import { getAdminClient } from "@/infrastructure/supabase/admin-client";
import { notifyVisitationRecorded } from "@/features/notifications/data/notification-service";

const CAIRO_TIME_ZONE = "Africa/Cairo";
const CLOSED_WEEK_MESSAGE = "أسبوع الافتقاد مغلق وأصبحت بياناته للقراءة فقط. بدأ أسبوع خدمة جديد تلقائيًا.";
const CONFLICT_MESSAGE = "قام خادم آخر بتعديل سجل الافتقاد. أغلق النافذة وافتح السجل مرة أخرى لمراجعة أحدث البيانات.";

class VisitationConflictError extends Error {
  readonly status = 409;
  constructor() { super(CONFLICT_MESSAGE); }
}

const cairoDate = () => new Intl.DateTimeFormat("en-CA", {
  timeZone: CAIRO_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date());

const isManager = (roles: string[]) =>
  roles.includes("system_owner") || roles.includes("system_manager");

const requireReadAccess = async () => {
  const actor = await requireActiveActor();
  if (!actor.permissions.includes("member_follow_up.read")) {
    throw new PermissionDeniedError("member_follow_up.read");
  }
  return actor;
};

const requireWriteAccess = async () => {
  const actor = await requireActiveActor();
  if (!actor.permissions.includes("member_follow_up.write")) {
    throw new PermissionDeniedError("member_follow_up.write");
  }
  return actor;
};

const statusFor = (count: number): AbsenceStatus => {
  if (count >= 3) return "danger";
  if (count === 2) return "critical";
  if (count === 1) return "important";
  return "regular";
};

const mapWeek = (row: Record<string, unknown>): ServiceWeek => ({
  id: String(row.id), startDate: String(row.start_date), endDate: String(row.end_date),
  meetingDate: String(row.meeting_date), status: String(row.status) as "OPEN" | "CLOSED",
  closedAt: row.closed_at ? String(row.closed_at) : null,
});

const normalizeWeekResult = (value: unknown): Record<string, unknown> => {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== "object") throw new Error("تعذر تحديد أسبوع الخدمة الحالي.");
  return row as Record<string, unknown>;
};

const mapType = (row: Record<string, unknown>): VisitationType => ({
  id: String(row.id), code: String(row.code), nameAr: String(row.name_ar),
  icon: String(row.icon || ""), color: String(row.color), sortOrder: Number(row.sort_order),
});

async function loadRecords(serviceWeekId?: string, memberId?: string): Promise<VisitationRecord[]> {
  const admin = getAdminClient();
  let query = admin.from("member_visitation_records")
    .select("id, service_week_id, member_id, visitation_type_id, visited_on, notes, recorded_by, created_by, updated_by, created_at, updated_at, version")
    .order("visited_on", { ascending: false }).order("created_at", { ascending: false });
  if (serviceWeekId) query = query.eq("service_week_id", serviceWeekId);
  if (memberId) query = query.eq("member_id", memberId);
  const { data, error } = await query;
  if (error) throw error;
  const rows = data || [];
  if (!rows.length) return [];

  const typeIds = [...new Set(rows.map((row) => row.visitation_type_id))];
  const servantIds = [...new Set(rows.map((row) => row.recorded_by))];
  const [{ data: types, error: typeError }, { data: users, error: userError }] = await Promise.all([
    admin.from("visitation_types").select("id, code, name_ar, icon").in("id", typeIds),
    admin.from("users").select("id, full_name").in("id", servantIds),
  ]);
  if (typeError) throw typeError;
  if (userError) throw userError;
  const typeMap = new Map((types || []).map((type) => [type.id, type]));
  const userMap = new Map((users || []).map((user) => [user.id, user.full_name]));
  return rows.map((row) => {
    const type = typeMap.get(row.visitation_type_id);
    return {
      id: row.id, memberId: row.member_id, serviceWeekId: row.service_week_id,
      typeId: row.visitation_type_id, typeCode: type?.code || "", typeName: type?.name_ar || "—",
      typeIcon: type?.icon || "", visitedOn: row.visited_on, notes: row.notes || "",
      servantId: row.recorded_by, servantName: userMap.get(row.recorded_by) || "—", createdAt: row.created_at,
      createdBy: row.created_by, updatedBy: row.updated_by, updatedAt: row.updated_at, version: Number(row.version),
    };
  });
}

export async function getVisitationDashboard(): Promise<VisitationDashboardData> {
  const actor = await requireReadAccess();
  const admin = getAdminClient();
  const { data: weekData, error: weekError } = await admin.rpc("ensure_current_service_week");
  if (weekError) throw weekError;
  const currentWeek = mapWeek(normalizeWeekResult(weekData));

  let memberQuery = admin.from("members")
    .select("id, group_id, full_name, joined_at").eq("active", true).order("full_name");
  if (!isManager(actor.roles)) {
    if (!actor.classIds.length) return {
      currentWeek, canRecord: false, today: cairoDate(), types: [], members: [],
    };
    memberQuery = memberQuery.in("group_id", actor.classIds);
  }

  const [{ data: members, error: memberError }, { data: groups, error: groupError },
    { data: sessions, error: sessionError }, { data: typeRows, error: typeError }] = await Promise.all([
    memberQuery,
    admin.from("groups").select("id, name, grade"),
    admin.from("attendance_sessions").select("id, attendance_date").order("attendance_date", { ascending: false }),
    admin.from("visitation_types").select("id, code, name_ar, icon, color, sort_order").eq("active", true).order("sort_order"),
  ]);
  if (memberError) throw memberError;
  if (groupError) throw groupError;
  if (sessionError) throw sessionError;
  if (typeError) throw typeError;

  const memberRows = members || [];
  const memberIds = memberRows.map((member) => member.id);
  const groupIds = [...new Set(memberRows.map((member) => member.group_id))];
  const sessionIds = (sessions || []).map((session) => session.id);
  const today = cairoDate();

  const attendancePromise = !memberIds.length || !sessionIds.length
    ? Promise.resolve({ data: [], error: null })
    : admin.from("attendance_records").select("member_id, session_id, service_attended")
      .in("member_id", memberIds).in("session_id", sessionIds);
  const memberAssignmentsPromise = !memberIds.length
    ? Promise.resolve({ data: [], error: null })
    : admin.from("user_member_assignments").select("member_id, user_id")
      .in("member_id", memberIds).lte("starts_on", today).or(`ends_on.is.null,ends_on.gte.${today}`);
  const classAssignmentsPromise = !groupIds.length
    ? Promise.resolve({ data: [], error: null })
    : admin.from("user_class_assignments").select("group_id, user_id, is_primary")
      .in("group_id", groupIds).lte("starts_on", today).or(`ends_on.is.null,ends_on.gte.${today}`);
  const [attendanceResult, memberAssignmentResult, classAssignmentResult, currentRecords] = await Promise.all([
    attendancePromise, memberAssignmentsPromise, classAssignmentsPromise, loadRecords(currentWeek.id),
  ]);
  if (attendanceResult.error) throw attendanceResult.error;
  if (memberAssignmentResult.error) throw memberAssignmentResult.error;
  if (classAssignmentResult.error) throw classAssignmentResult.error;

  const assignmentUserIds = [...new Set([
    ...(memberAssignmentResult.data || []).map((row) => row.user_id),
    ...(classAssignmentResult.data || []).map((row) => row.user_id),
  ])];
  const usersResult = assignmentUserIds.length
    ? await admin.from("users").select("id, full_name").in("id", assignmentUserIds)
    : { data: [], error: null };
  if (usersResult.error) throw usersResult.error;

  const groupsById = new Map((groups || []).map((group) => [group.id, group]));
  const namesById = new Map((usersResult.data || []).map((user) => [user.id, user.full_name]));
  const directByMember = new Map<string, string[]>();
  for (const assignment of memberAssignmentResult.data || []) {
    const names = directByMember.get(assignment.member_id) || [];
    const name = namesById.get(assignment.user_id);
    if (name) names.push(name);
    directByMember.set(assignment.member_id, names);
  }
  const classByGroup = new Map<string, string[]>();
  for (const assignment of [...(classAssignmentResult.data || [])].sort((a, b) => Number(b.is_primary) - Number(a.is_primary))) {
    const names = classByGroup.get(assignment.group_id) || [];
    const name = namesById.get(assignment.user_id);
    if (name && !names.includes(name)) names.push(name);
    classByGroup.set(assignment.group_id, names);
  }

  const sessionById = new Map((sessions || []).map((session) => [session.id, session.attendance_date]));
  const attendanceByMember = new Map<string, { date: string; attended: boolean }[]>();
  for (const record of attendanceResult.data || []) {
    const date = sessionById.get(record.session_id);
    if (!date) continue;
    const history = attendanceByMember.get(record.member_id) || [];
    history.push({ date, attended: record.service_attended });
    attendanceByMember.set(record.member_id, history);
  }
  const recordsByMember = new Map<string, VisitationRecord[]>();
  for (const record of currentRecords) {
    const records = recordsByMember.get(record.memberId) || [];
    records.push(record);
    recordsByMember.set(record.memberId, records);
  }

  return {
    currentWeek, today,
    canRecord: actor.permissions.includes("member_follow_up.write") && currentWeek.status === "OPEN",
    types: (typeRows || []).map((row) => mapType(row)),
    members: memberRows.map((member) => {
      const history = (attendanceByMember.get(member.id) || [])
        .filter((item) => item.date >= member.joined_at).sort((a, b) => b.date.localeCompare(a.date));
      let consecutiveAbsences = 0;
      for (const item of history) {
        if (item.attended) break;
        consecutiveAbsences += 1;
      }
      const memberRecords = recordsByMember.get(member.id) || [];
      const group = groupsById.get(member.group_id);
      const responsible = directByMember.get(member.id) || classByGroup.get(member.group_id) || [];
      return {
        id: member.id, name: member.full_name, groupId: member.group_id,
        groupName: group?.name || "—", grade: group?.grade || "—",
        responsibleServant: responsible.join("، ") || "—",
        consecutiveAbsences, status: statusFor(consecutiveAbsences),
        lastAttendance: history.find((item) => item.attended)?.date || null,
        currentVisitations: memberRecords,
        lastNote: memberRecords.find((record) => record.notes.trim())?.notes || null,
      };
    }),
  };
}

export async function getMemberVisitationHistory(memberId: string) {
  const actor = await requireReadAccess();
  const admin = getAdminClient();
  const { data: member, error } = await admin.from("members").select("id, group_id").eq("id", memberId).maybeSingle();
  if (error) throw error;
  if (!member) return [];
  if (!isManager(actor.roles) && !actor.classIds.includes(member.group_id)) {
    throw new PermissionDeniedError("member_follow_up.read");
  }
  const records = await loadRecords(undefined, memberId);
  if (!records.length) return [];
  const weekIds = [...new Set(records.map((record) => record.serviceWeekId))];
  const { data: weeks, error: weekError } = await admin.from("service_weeks")
    .select("id, start_date, end_date, meeting_date, status, closed_at").in("id", weekIds);
  if (weekError) throw weekError;
  const weekMap = new Map((weeks || []).map((week) => [week.id, mapWeek(week)]));
  return records.map((record) => ({ ...record, week: weekMap.get(record.serviceWeekId) || null }));
}

export async function createVisitation(input: unknown) {
  const actor = await requireWriteAccess();
  const parsed = createVisitationSchema.parse(input);
  const admin = getAdminClient();
  const { data: member, error: memberError } = await admin.from("members")
    .select("id, group_id, active").eq("id", parsed.memberId).maybeSingle();
  if (memberError) throw memberError;
  if (!member?.active) throw new Error("المخدوم غير موجود أو غير نشط.");
  if (!isManager(actor.roles) && !actor.classIds.includes(member.group_id)) {
    throw new PermissionDeniedError("member_follow_up.write");
  }
  const { data: week, error: weekError } = await admin.rpc("ensure_current_service_week");
  if (weekError) throw weekError;
  const currentWeek = mapWeek(normalizeWeekResult(week));
  if (parsed.serviceWeekId !== currentWeek.id) throw new Error(CLOSED_WEEK_MESSAGE);
  if (currentWeek.status !== "OPEN") throw new Error(CLOSED_WEEK_MESSAGE);
  if (parsed.visitedOn < currentWeek.startDate || parsed.visitedOn > currentWeek.endDate) {
    throw new Error("تاريخ الافتقاد يجب أن يقع داخل أسبوع الخدمة الحالي.");
  }
  const { data, error } = await admin.rpc("save_member_visitation", {
    p_service_week_id: currentWeek.id,
    p_member_id: parsed.memberId,
    p_visitation_type_id: parsed.visitationTypeId,
    p_visited_on: parsed.visitedOn,
    p_notes: parsed.notes,
    p_actor: actor.id,
    p_record_id: parsed.recordId || null,
    p_expected_version: parsed.expectedVersion || null,
  });
  if (error) {
    if (error.code === "40001" || error.message.includes("VISITATION_CONFLICT")) {
      throw new VisitationConflictError();
    }
    throw error;
  }
  const saved = Array.isArray(data) ? data[0] : data;
  try {
    await notifyVisitationRecorded({ actorId: actor.id, actorName: actor.fullName,
      memberId: parsed.memberId, visitationTypeId: parsed.visitationTypeId });
  } catch { /* A notification delivery issue must not invalidate a saved visitation. */ }
  return saved;
}

export async function getMeetingVisitationSnapshot(meetingDate: string) {
  const actor = await requireActiveActor();
  if (!actor.permissions.includes("member_attendance.read") &&
      !actor.permissions.includes("member_attendance.write")) {
    throw new PermissionDeniedError("member_attendance.read");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(meetingDate)) throw new Error("تاريخ الاجتماع غير صالح.");
  const admin = getAdminClient();
  const rollover = await admin.rpc("ensure_current_service_week");
  if (rollover.error) throw rollover.error;
  const { data: week, error: weekError } = await admin.from("service_weeks")
    .select("id, start_date, end_date, meeting_date, status, closed_at")
    .eq("meeting_date", meetingDate).eq("status", "CLOSED").maybeSingle();
  if (weekError) throw weekError;
  if (!week) return { week: null, records: {} };
  const records = await loadRecords(week.id);
  const memberIds = [...new Set(records.map((record) => record.memberId))];
  let allowedIds = new Set(memberIds);
  if (!isManager(actor.roles) && memberIds.length) {
    const { data: allowed, error } = await admin.from("members").select("id")
      .in("id", memberIds).in("group_id", actor.classIds.length ? actor.classIds : ["00000000-0000-0000-0000-000000000000"]);
    if (error) throw error;
    allowedIds = new Set((allowed || []).map((member) => member.id));
  }
  const byMember: Record<string, Record<string, boolean>> = {};
  for (const record of records) {
    if (!allowedIds.has(record.memberId)) continue;
    byMember[record.memberId] ||= {};
    byMember[record.memberId][record.typeCode] = true;
  }
  return { week: mapWeek(week), records: byMember };
}

export { CLOSED_WEEK_MESSAGE, CONFLICT_MESSAGE };
