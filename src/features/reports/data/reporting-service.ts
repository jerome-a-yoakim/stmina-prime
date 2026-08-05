import "server-only";

import { requirePermission } from "@/features/access-control/data/authorization-service";
import type { CurrentActor } from "@/features/access-control/types/access-control";
import type { ReportingDataset } from "@/features/reports/types/reporting";
import { getAdminClient } from "@/infrastructure/supabase/admin-client";

const isManager = (roles: string[]) =>
  roles.includes("system_owner") || roles.includes("system_manager");

const unique = (values: Array<string | null | undefined>) =>
  [...new Set(values.filter((value): value is string => Boolean(value)))];

export async function getReportingDataset(): Promise<ReportingDataset> {
  const actor = await requirePermission("reports.read");
  return getReportingDatasetForActor(actor);
}

export async function getReportingDatasetForActor(actor: CurrentActor): Promise<ReportingDataset> {
  const admin = getAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  let groupQuery = admin.from("groups").select("id, name, grade, active").order("sort_order");
  if (!isManager(actor.roles)) {
    if (!actor.classIds.length) {
      return {
        generatedAt: new Date().toISOString(), canExport: actor.permissions.includes("reports.export"),
        defaultPeriod: null, groups: [], members: [], sessions: [], visitations: [], limitations: [],
      };
    }
    groupQuery = groupQuery.in("id", actor.classIds);
  }

  const { data: groups, error: groupError } = await groupQuery;
  if (groupError) throw groupError;
  const groupRows = groups || [];
  const groupIds = groupRows.map((group) => group.id);

  const memberResult = groupIds.length
    ? await admin.from("members")
      .select("id, group_id, full_name, given_name, father_name, phone, family_phone, additional_family_phone, address, school, birth_date, joined_at, active, archived_at, brother_of_lord")
      .in("group_id", groupIds).order("full_name")
    : { data: [], error: null };
  if (memberResult.error) throw memberResult.error;
  const memberRows = memberResult.data || [];
  const memberIds = memberRows.map((member) => member.id);

  const [sessionsResult, serviceWeeksResult, activitiesResult, memberActivitiesResult, classAssignmentsResult, memberAssignmentsResult, visitationsResult] = await Promise.all([
    admin.from("attendance_sessions").select("id, attendance_date, created_at").order("attendance_date"),
    admin.from("service_weeks").select("start_date, end_date, meeting_date").order("meeting_date"),
    admin.from("activities").select("id, name"),
    memberIds.length
      ? admin.from("member_activities").select("member_id, activity_id").in("member_id", memberIds)
      : Promise.resolve({ data: [], error: null }),
    groupIds.length
      ? admin.from("user_class_assignments").select("group_id, user_id, is_primary")
        .in("group_id", groupIds).lte("starts_on", today).or(`ends_on.is.null,ends_on.gte.${today}`)
      : Promise.resolve({ data: [], error: null }),
    memberIds.length
      ? admin.from("user_member_assignments").select("member_id, user_id")
        .in("member_id", memberIds).lte("starts_on", today).or(`ends_on.is.null,ends_on.gte.${today}`)
      : Promise.resolve({ data: [], error: null }),
    memberIds.length
      ? admin.from("member_visitation_records")
        .select("id, member_id, visitation_type_id, visited_on, recorded_by, notes").in("member_id", memberIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  for (const result of [sessionsResult, serviceWeeksResult, activitiesResult, memberActivitiesResult, classAssignmentsResult, memberAssignmentsResult, visitationsResult]) {
    if (result.error) throw result.error;
  }

  const sessionRows = sessionsResult.data || [];
  const latestSession = sessionRows.at(-1);
  const latestServiceWeek = latestSession
    ? (serviceWeeksResult.data || []).find((week) => week.meeting_date === latestSession.attendance_date)
    : null;
  const sessionIds = sessionRows.map((session) => session.id);
  const visitationRows = visitationsResult.data || [];
  const typeIds = unique(visitationRows.map((row) => row.visitation_type_id));
  const userIds = unique([
    ...(classAssignmentsResult.data || []).map((row) => row.user_id),
    ...(memberAssignmentsResult.data || []).map((row) => row.user_id),
    ...visitationRows.map((row) => row.recorded_by),
  ]);

  const [recordsResult, usersResult, typesResult] = await Promise.all([
    memberIds.length && sessionIds.length
      ? admin.from("attendance_records")
        .select("session_id, member_id, service_attended, mass_attended, mass_service, confession, phone_follow_up, home_follow_up")
        .in("member_id", memberIds).in("session_id", sessionIds)
      : Promise.resolve({ data: [], error: null }),
    userIds.length
      ? admin.from("users").select("id, full_name").in("id", userIds)
      : Promise.resolve({ data: [], error: null }),
    typeIds.length
      ? admin.from("visitation_types").select("id, code, name_ar").in("id", typeIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  for (const result of [recordsResult, usersResult, typesResult]) if (result.error) throw result.error;

  const activityById = new Map((activitiesResult.data || []).map((row) => [row.id, row.name]));
  const activitiesByMember = new Map<string, string[]>();
  for (const link of memberActivitiesResult.data || []) {
    const name = activityById.get(link.activity_id);
    if (!name) continue;
    activitiesByMember.set(link.member_id, [...(activitiesByMember.get(link.member_id) || []), name]);
  }

  const userById = new Map((usersResult.data || []).map((row) => [row.id, row.full_name]));
  const servantsByGroup = new Map<string, string[]>();
  for (const link of [...(classAssignmentsResult.data || [])].sort((a, b) => Number(b.is_primary) - Number(a.is_primary))) {
    const name = userById.get(link.user_id);
    if (!name) continue;
    servantsByGroup.set(link.group_id, unique([...(servantsByGroup.get(link.group_id) || []), name]));
  }
  const servantsByMember = new Map<string, string[]>();
  for (const link of memberAssignmentsResult.data || []) {
    const name = userById.get(link.user_id);
    if (!name) continue;
    servantsByMember.set(link.member_id, unique([...(servantsByMember.get(link.member_id) || []), name]));
  }

  const recordsBySession = new Map<string, typeof recordsResult.data>();
  for (const record of recordsResult.data || []) {
    recordsBySession.set(record.session_id, [...(recordsBySession.get(record.session_id) || []), record]);
  }
  const typeById = new Map((typesResult.data || []).map((row) => [row.id, row]));

  return {
    generatedAt: new Date().toISOString(),
    canExport: actor.permissions.includes("reports.export"),
    defaultPeriod: latestSession ? {
      from: latestServiceWeek?.start_date || latestSession.attendance_date,
      to: latestSession.attendance_date,
      attendanceDate: latestSession.attendance_date,
    } : null,
    groups: groupRows.map((group) => ({
      id: group.id, name: group.name, grade: group.grade || "", active: group.active,
      responsibleServants: servantsByGroup.get(group.id) || [],
    })),
    members: memberRows.map((member) => ({
      id: member.id, groupId: member.group_id, fullName: member.full_name,
      givenName: member.given_name || "", fatherName: member.father_name || "",
      phone: member.phone || "", familyPhone: member.family_phone || "",
      additionalFamilyPhone: member.additional_family_phone || "", address: member.address || "",
      school: member.school || "", birthDate: member.birth_date || null, joinedAt: member.joined_at,
      active: member.active, archivedAt: member.archived_at || null,
      brotherOfLord: Boolean(member.brother_of_lord), activityNames: activitiesByMember.get(member.id) || [],
      responsibleServants: servantsByMember.get(member.id) || servantsByGroup.get(member.group_id) || [],
    })),
    sessions: sessionRows.map((session) => ({
      id: session.id, date: session.attendance_date, createdAt: session.created_at,
      records: (recordsBySession.get(session.id) || []).map((record) => ({
        memberId: record.member_id, serviceAttended: Boolean(record.service_attended),
        massAttended: Boolean(record.mass_attended), massService: Boolean(record.mass_service),
        confession: Boolean(record.confession), phoneFollowUp: Boolean(record.phone_follow_up),
        homeFollowUp: Boolean(record.home_follow_up),
      })),
    })),
    visitations: visitationRows.map((row) => {
      const type = typeById.get(row.visitation_type_id);
      return {
        id: row.id, memberId: row.member_id, visitedOn: row.visited_on,
        typeCode: type?.code || "", typeName: type?.name_ar || "—",
        servantName: userById.get(row.recorded_by) || "—", notes: row.notes || "",
      };
    }),
    limitations: [
      "تعتمد التقارير التاريخية على الأسرة الحالية للمخدوم لعدم وجود سجل زمني لنقل العضوية بين الأسر.",
      "عدم وجود سجل حضور لا يُحسب غيابًا؛ ويظهر بشكل مستقل تحت بند «غير مسجل».",
    ],
  };
}
