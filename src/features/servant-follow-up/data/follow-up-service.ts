import "server-only";
import { getAdminClient } from "@/infrastructure/supabase/admin-client";
import { requireActiveActor } from "@/features/access-control/data/authorization-service";
import { PermissionDeniedError } from "@/features/access-control/types/access-control";
import { writeAuditLog } from "@/features/audit/data/audit-service";
import {
  servantFollowUpDaySchema,
  servantFollowUpRecordSchema,
} from "@/features/servant-follow-up/schemas/follow-up-schema";

const isAdministrator = (roles: string[]) =>
  roles.includes("system_owner") || roles.includes("system_manager");

async function requireFollowUpAdministrator() {
  const actor = await requireActiveActor();
  if (!isAdministrator(actor.roles)) {
    throw new PermissionDeniedError("servant_follow_up.record");
  }
  return actor;
}

export async function listAllServantFollowUpRecords() {
  const actor = await requireActiveActor();
  if (!isAdministrator(actor.roles)) {
    throw new PermissionDeniedError("servant_follow_up.read_all");
  }
  const { data, error } = await getAdminClient()
    .from("servant_follow_up_records")
    .select("id, user_id, follow_up_date, friday_service_attendance, liturgy_attendance, lesson_preparation, created_at, updated_at, users!servant_follow_up_records_user_id_fkey(full_name)")
    .order("follow_up_date", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function listServantFollowUpDays() {
  const actor = await requireActiveActor();
  if (!isAdministrator(actor.roles)) {
    throw new PermissionDeniedError("servant_follow_up.read_all");
  }
  const { data, error } = await getAdminClient().from("servant_follow_up_days")
    .select("follow_up_date").order("follow_up_date", { ascending: false });
  if (error) throw error;
  return (data || []).map((row) => row.follow_up_date);
}

export async function listOwnServantFollowUpRecords() {
  const actor = await requireActiveActor();
  const admin = getAdminClient();
  const [days, records] = await Promise.all([
    admin.from("servant_follow_up_days").select("follow_up_date").order("follow_up_date", { ascending: false }),
    admin.from("servant_follow_up_records")
      .select("id, user_id, follow_up_date, friday_service_attendance, liturgy_attendance, lesson_preparation, created_at, updated_at")
      .eq("user_id", actor.id),
  ]);
  if (days.error) throw days.error;
  if (records.error) throw records.error;
  const byDate = new Map((records.data || []).map((record) => [record.follow_up_date, record]));
  return (days.data || []).map(({ follow_up_date }) => byDate.get(follow_up_date) || {
    id: `absent-${follow_up_date}`,
    user_id: actor.id,
    follow_up_date,
    friday_service_attendance: false,
    liturgy_attendance: false,
    lesson_preparation: false,
    created_at: null,
    updated_at: null,
  });
}

export async function createServantFollowUpRecord(input: unknown) {
  const actor = await requireFollowUpAdministrator();
  const parsed = servantFollowUpRecordSchema.parse(input);
  const { data, error } = await getAdminClient().from("servant_follow_up_records").insert({
    user_id: parsed.userId,
    follow_up_date: parsed.followUpDate,
    friday_service_attendance: parsed.fridayServiceAttendance,
    liturgy_attendance: parsed.liturgyAttendance,
    lesson_preparation: parsed.lessonPreparation,
    created_by: actor.id,
    updated_by: actor.id,
  }).select().single();
  if (error) throw error;
  await writeAuditLog({
    actorUserId: actor.id, action: "servant_follow_up.created",
    entityType: "servant_follow_up_record", entityId: data.id, afterData: data,
  });
  return data;
}

export async function saveServantFollowUpDay(input: unknown) {
  const actor = await requireFollowUpAdministrator();
  const parsed = servantFollowUpDaySchema.parse(input);
  const admin = getAdminClient();
  const day = await admin.from("servant_follow_up_days").upsert({
    follow_up_date: parsed.followUpDate,
    created_by: actor.id,
  }, { onConflict: "follow_up_date" });
  if (day.error) throw day.error;
  const userIds = parsed.records.map((record) => record.userId);
  const completed = parsed.records.filter((record) =>
    record.fridayServiceAttendance || record.liturgyAttendance || record.lessonPreparation);
  const absentUserIds = parsed.records.filter((record) =>
    !record.fridayServiceAttendance && !record.liturgyAttendance && !record.lessonPreparation)
    .map((record) => record.userId);
  const existing = await admin.from("servant_follow_up_records").select("*")
    .eq("follow_up_date", parsed.followUpDate).in("user_id", userIds);
  if (existing.error) throw existing.error;

  let saved: unknown[] = [];
  if (completed.length) {
    const result = await admin.from("servant_follow_up_records").upsert(completed.map((record) => ({
      user_id: record.userId,
      follow_up_date: parsed.followUpDate,
      friday_service_attendance: record.fridayServiceAttendance,
      liturgy_attendance: record.liturgyAttendance,
      lesson_preparation: record.lessonPreparation,
      created_by: actor.id,
      updated_by: actor.id,
    })), { onConflict: "user_id,follow_up_date" }).select();
    if (result.error) throw result.error;
    saved = result.data || [];
  }
  if (absentUserIds.length) {
    const { error: deleteError } = await admin.from("servant_follow_up_records").delete()
      .eq("follow_up_date", parsed.followUpDate).in("user_id", absentUserIds);
    if (deleteError) throw deleteError;
  }
  await writeAuditLog({
    actorUserId: actor.id, action: "servant_follow_up.day_saved",
    entityType: "servant_follow_up_day", entityId: null,
    beforeData: existing.data || [],
    afterData: { followUpDate: parsed.followUpDate, records: saved },
    metadata: { servantCount: parsed.records.length, completedCount: completed.length },
  });
  return saved;
}

export async function updateServantFollowUpRecord(id: string, input: unknown) {
  const actor = await requireFollowUpAdministrator();
  const parsed = servantFollowUpRecordSchema.parse(input);
  const admin = getAdminClient();
  const previous = await admin.from("servant_follow_up_records").select("*").eq("id", id).single();
  if (previous.error) throw previous.error;
  const { data, error } = await admin.from("servant_follow_up_records").update({
    user_id: parsed.userId,
    follow_up_date: parsed.followUpDate,
    friday_service_attendance: parsed.fridayServiceAttendance,
    liturgy_attendance: parsed.liturgyAttendance,
    lesson_preparation: parsed.lessonPreparation,
    updated_by: actor.id,
  }).eq("id", id).select().single();
  if (error) throw error;
  await writeAuditLog({
    actorUserId: actor.id, action: "servant_follow_up.updated",
    entityType: "servant_follow_up_record", entityId: id,
    beforeData: previous.data, afterData: data,
  });
  return data;
}

export async function deleteServantFollowUpRecord(id: string) {
  const actor = await requireFollowUpAdministrator();
  const admin = getAdminClient();
  const previous = await admin.from("servant_follow_up_records").select("*").eq("id", id).single();
  if (previous.error) throw previous.error;
  const { error } = await admin.from("servant_follow_up_records").delete().eq("id", id);
  if (error) throw error;
  await writeAuditLog({
    actorUserId: actor.id, action: "servant_follow_up.deleted",
    entityType: "servant_follow_up_record", entityId: id, beforeData: previous.data,
  });
}
