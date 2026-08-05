import "server-only";

import { requireActiveActor } from "@/features/access-control/data/authorization-service";
import { PermissionDeniedError } from "@/features/access-control/types/access-control";
import { serviceSettingsSchema } from "@/features/visitation/schemas/service-settings-schema";
import { getAdminClient } from "@/infrastructure/supabase/admin-client";

export async function listServiceSettings() {
  const actor = await requireActiveActor();
  if (!actor.permissions.includes("settings.manage") &&
      !actor.permissions.includes("member_follow_up.read") &&
      !actor.permissions.includes("member_attendance.read")) {
    throw new PermissionDeniedError("settings.manage");
  }
  const { data, error } = await getAdminClient().from("service_settings")
    .select("id, timezone, meeting_weekday, meeting_time, attendance_deadline, allow_visitation_after_meeting, automatic_week_rollover, effective_from, updated_by, created_at, updated_at")
    .order("effective_from", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createServiceSettings(input: unknown) {
  const actor = await requireActiveActor();
  if (!actor.permissions.includes("settings.manage")) {
    throw new PermissionDeniedError("settings.manage");
  }
  const parsed = serviceSettingsSchema.parse(input);
  const { data, error } = await getAdminClient().rpc("save_service_settings", {
    p_timezone: parsed.timezone,
    p_meeting_weekday: parsed.meetingWeekday,
    p_meeting_time: parsed.meetingTime,
    p_attendance_deadline: parsed.attendanceDeadline,
    p_allow_visitation_after_meeting: parsed.allowVisitationAfterMeeting,
    p_automatic_week_rollover: parsed.automaticWeekRollover,
    p_effective_from: parsed.effectiveFrom,
    p_actor: actor.id,
  });
  if (error) throw error;
  return { id: data };
}

