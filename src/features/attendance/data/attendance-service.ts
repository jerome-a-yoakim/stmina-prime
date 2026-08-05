import { createBrowserSupabaseClient } from "@/infrastructure/supabase/browser-client";

// ─── Domain types exposed to LegacyApplication ───────────────────────────────
//
// LegacyApplication uses these exact field keys (Arabic strings).
// The schema stores them as named boolean columns.  We translate both ways.
//
export interface AttendanceRecord {
  memberId: string;
  "حضور الخدمة":             boolean;
  "حضور القداس":             boolean;
  "خدمة القداس":             boolean;
  "الأعتراف":                boolean;
  "الأفتقاد التيليفوني":     boolean;
  "الأفتقاد المنزلي":        boolean;
  [fieldKey: string]: boolean | string;
}

export interface Submission {
  id: string;
  date: string;      // formatted Arabic display string
  dateISO: string;   // YYYY-MM-DD stored in attendance_sessions.attendance_date
  records: AttendanceRecord[];
  submittedBy: string | null;
}

export interface SaveSubmissionInput {
  id?: string;       // present → update, absent → insert
  dateISO: string;
  records: AttendanceRecord[];
}

// ─── Internal row shapes ──────────────────────────────────────────────────────

interface SessionRow {
  id: string;
  attendance_date: string;
  created_by: string | null;
}

interface RecordRow {
  id: string;
  session_id: string;
  member_id: string;
  service_attended:  boolean;
  mass_attended:     boolean;
  mass_service:      boolean;
  confession:        boolean;
  phone_follow_up:   boolean;
  home_follow_up:    boolean;
}

// ─── Field mapping: Arabic UI key → schema column ────────────────────────────
//
// Verified against migration 202607240001_initial_schema.sql
//
const TO_FIELD: Record<string, string> = {
  service_attended:  "حضور الخدمة",
  mass_attended:     "حضور القداس",
  mass_service:      "خدمة القداس",
  confession:        "الأعتراف",
  phone_follow_up:   "الأفتقاد التيليفوني",
  home_follow_up:    "الأفتقاد المنزلي",
};

// ─── Mappers ─────────────────────────────────────────────────────────────────

const formatDate = (iso: string) =>
  new Date(iso + "T12:00:00").toLocaleDateString("ar-EG");

const recordRowToAttendanceRecord = (row: RecordRow): AttendanceRecord => ({
  memberId:                       row.member_id,
  [TO_FIELD.service_attended]:    row.service_attended,
  [TO_FIELD.mass_attended]:       row.mass_attended,
  [TO_FIELD.mass_service]:        row.mass_service,
  [TO_FIELD.confession]:          row.confession,
  [TO_FIELD.phone_follow_up]:     row.phone_follow_up,
  [TO_FIELD.home_follow_up]:      row.home_follow_up,
} as AttendanceRecord);

const attendanceRecordToRow = (
  record: AttendanceRecord,
  sessionId: string,
  updatedBy: string
) => ({
  session_id:        sessionId,
  member_id:         record.memberId,
  updated_by:        updatedBy,           // required NOT NULL in schema
  service_attended:  Boolean((record as Record<string, unknown>)[TO_FIELD.service_attended]),
  mass_attended:     Boolean((record as Record<string, unknown>)[TO_FIELD.mass_attended]),
  mass_service:      Boolean((record as Record<string, unknown>)[TO_FIELD.mass_service]),
  confession:        Boolean((record as Record<string, unknown>)[TO_FIELD.confession]),
  phone_follow_up:   Boolean((record as Record<string, unknown>)[TO_FIELD.phone_follow_up]),
  home_follow_up:    Boolean((record as Record<string, unknown>)[TO_FIELD.home_follow_up]),
});

// ─── Public API ───────────────────────────────────────────────────────────────

export const listSubmissions = async (): Promise<Submission[]> => {
  const c = createBrowserSupabaseClient();

  const { data: sessions, error: sessErr } = await c
    .from("attendance_sessions")
    .select("id, attendance_date, created_by")
    .order("attendance_date");
  if (sessErr) throw sessErr;
  if (!sessions || sessions.length === 0) return [];

  const sessionIds = (sessions as SessionRow[]).map((s) => s.id);

  const { data: recordRows, error: recErr } = await c
    .from("attendance_records")
    .select("id, session_id, member_id, service_attended, mass_attended, mass_service, confession, phone_follow_up, home_follow_up")
    .in("session_id", sessionIds);
  if (recErr) throw recErr;

  const bySession = new Map<string, AttendanceRecord[]>();
  for (const row of (recordRows || []) as RecordRow[]) {
    const list = bySession.get(row.session_id) || [];
    list.push(recordRowToAttendanceRecord(row));
    bySession.set(row.session_id, list);
  }

  return (sessions as SessionRow[]).map((s) => ({
    id:          s.id,
    date:        formatDate(s.attendance_date),
    dateISO:     s.attendance_date,
    records:     bySession.get(s.id) || [],
    submittedBy: s.created_by,
  }));
};

export const saveSubmission = async (
  input: SaveSubmissionInput,
  submittedBy: string,
  emitNotification = true,
): Promise<Submission> => {
  const c = createBrowserSupabaseClient();

  let sessionId: string;
  let sessionDate: string;

  if (input.id) {
    // ── Update existing session ─────────────────────────────────────────────
    // Note: schema has unique constraint on attendance_date, so we just update
    // the date; created_by is immutable (set on insert).
    const { data, error } = await c
      .from("attendance_sessions")
      .update({ attendance_date: input.dateISO })
      .eq("id", input.id)
      .select("id, attendance_date, created_by")
      .single();
    if (error) throw error;
    sessionId   = (data as SessionRow).id;
    sessionDate = (data as SessionRow).attendance_date;

    // Delete old records; re-insert fresh ones
    const { error: delErr } = await c
      .from("attendance_records")
      .delete()
      .eq("session_id", sessionId);
    if (delErr) throw delErr;
  } else {
    // ── Insert new session ──────────────────────────────────────────────────
    const { data, error } = await c
      .from("attendance_sessions")
      .insert({ attendance_date: input.dateISO, created_by: submittedBy })
      .select("id, attendance_date, created_by")
      .single();
    if (error) throw error;
    sessionId   = (data as SessionRow).id;
    sessionDate = (data as SessionRow).attendance_date;
  }

  // ── Insert attendance records ─────────────────────────────────────────────
  if (input.records.length > 0) {
    const rows = input.records.map((r) =>
      attendanceRecordToRow(r, sessionId, submittedBy)
    );
    const { error: insertErr } = await c.from("attendance_records").insert(rows);
    if (insertErr) throw insertErr;
  }

  if (emitNotification) {
    await fetch("/api/notifications/events", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "attendance.submitted", sessionId }),
    });
  }

  return {
    id:          sessionId,
    date:        formatDate(sessionDate),
    dateISO:     sessionDate,
    records:     input.records,
    submittedBy: submittedBy,
  };
};

export const deleteSubmission = async (id: string): Promise<void> => {
  const c = createBrowserSupabaseClient();
  // attendance_records cascade-delete when the session is deleted
  const { error } = await c.from("attendance_sessions").delete().eq("id", id);
  if (error) throw error;
};
