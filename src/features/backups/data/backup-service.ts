import { createBrowserSupabaseClient } from "@/infrastructure/supabase/browser-client";
import type { Group } from "@/features/groups/types/group";
import type { Member } from "@/features/members/types/member";
import { listActivities, type Activity } from "@/features/activities/data/activity-service";
import { listSubmissions, type Submission } from "@/features/attendance/data/attendance-service";

// A full point-in-time export of every business table, used by BackupsPage
// for the manual "download JSON" / "restore from JSON" workflow.
// IDs are preserved verbatim on export/restore so that cross-table references
// (member_activities, attendance_records.member_id, member_notes.member_id) stay valid.
export interface Snapshot {
  format: "st-mina-json-backup";
  schemaVersion: 2;
  ts: string;
  groups: Group[];
  members: Member[];
  subs: Submission[];
  activities: Activity[];
  memberNotes: MemberNoteRow[];
}

interface LegacySnapshot extends Omit<Snapshot, "format" | "schemaVersion" | "memberNotes"> {
  format?: never;
  schemaVersion?: never;
  memberNotes?: never;
}

interface MemberNoteRow {
  id: string;
  member_id: string;
  title: string;
  content: string;
  category: string;
  is_important: boolean;
  created_by: string | null;
  created_at: string;
  updated_at?: string;
}

interface GroupRow {
  id: string;
  name: string;
  grade: string | null;
  active: boolean;
  sort_order: number;
  main_servant: string | null;
  assistant_servants: string[] | null;
  servant_contact: string | null;
}

const mapGroup = (r: GroupRow): Group => ({
  id: r.id,
  name: r.name,
  grade: r.grade,
  active: r.active,
  sortOrder: r.sort_order,
  mainServant: r.main_servant || null,
  assistantServants: r.assistant_servants || [],
  servantContact: r.servant_contact || null,
} as Group);

interface MemberRow {
  id: string;
  group_id: string;
  full_name: string;
  given_name: string | null;
  father_name: string | null;
  phone: string | null;
  family_phone: string | null;
  additional_family_phone: string | null;
  address: string | null;
  school: string | null;
  birth_date: string | null;
  notes: string | null;
  active: boolean;
  joined_at: string;
  brother_of_lord: boolean | null;
  archived_at: string | null;
}

const mapMember = (r: MemberRow, activityIds: string[]): Member => ({
  id: r.id,
  groupId: r.group_id,
  fullName: r.full_name,
  givenName: r.given_name,
  fatherName: r.father_name,
  phone: r.phone,
  familyPhone: r.family_phone,
  additionalFamilyPhone: r.additional_family_phone,
  address: r.address,
  school: r.school,
  birthDate: r.birth_date,
  notes: r.notes,
  active: r.active,
  joinedAt: r.joined_at,
  brotherOfLord: r.brother_of_lord || false,
  archivedAt: r.archived_at || null,
  activityIds,
} as Member);

// listAllGroups()/listAllMembers() filter to active rows; backup needs ALL.
const fetchAllGroups = async (): Promise<Group[]> => {
  const c = createBrowserSupabaseClient();
  const { data, error } = await c.from("groups").select("*").order("sort_order");
  if (error) throw error;
  return (data as GroupRow[]).map(mapGroup);
};

const fetchAllMembers = async (): Promise<Member[]> => {
  const c = createBrowserSupabaseClient();
  const [{ data: rows, error }, { data: links, error: linkError }] = await Promise.all([
    c.from("members").select("*").order("full_name"),
    c.from("member_activities").select("member_id, activity_id"),
  ]);
  if (error) throw error;
  if (linkError) throw linkError;
  const byMember = new Map<string, string[]>();
  (links || []).forEach((l: { member_id: string; activity_id: string }) => {
    const list = byMember.get(l.member_id) || [];
    list.push(l.activity_id);
    byMember.set(l.member_id, list);
  });
  return (rows as MemberRow[]).map((r) => mapMember(r, byMember.get(r.id) || []));
};

const fetchAllMemberNotes = async (): Promise<MemberNoteRow[]> => {
  const c = createBrowserSupabaseClient();
  const { data, error } = await c.from("member_notes").select("*").order("created_at");
  if (error) throw error;
  return (data || []) as MemberNoteRow[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const validateSnapshot = (value: unknown): Snapshot => {
  if (!isRecord(value)) throw new Error("Invalid backup file.");
  if (value.format !== undefined && value.format !== "st-mina-json-backup") {
    throw new Error("Unsupported backup format.");
  }
  if (value.schemaVersion !== undefined && value.schemaVersion !== 2) {
    throw new Error("Unsupported backup version.");
  }
  if (typeof value.ts !== "string" || !value.ts || Number.isNaN(Date.parse(value.ts))) {
    throw new Error("The backup timestamp is missing or invalid.");
  }
  for (const key of ["groups", "members", "subs", "activities"] as const) {
    if (!Array.isArray(value[key])) throw new Error(`The backup is missing ${key}.`);
  }
  if (value.memberNotes !== undefined && !Array.isArray(value.memberNotes)) {
    throw new Error("The backup member notes are invalid.");
  }

  const legacy = value as unknown as LegacySnapshot;
  return {
    format: "st-mina-json-backup",
    schemaVersion: 2,
    ts: legacy.ts,
    groups: legacy.groups,
    members: legacy.members,
    subs: legacy.subs,
    activities: legacy.activities,
    memberNotes: Array.isArray(value.memberNotes) ? value.memberNotes as MemberNoteRow[] : [],
  };
};

export const exportSnapshot = async (): Promise<Snapshot> => {
  const [groups, members, subs, activities, memberNotes] = await Promise.all([
    fetchAllGroups(),
    fetchAllMembers(),
    listSubmissions(),        // uses attendance_sessions + attendance_records
    listActivities(),
    fetchAllMemberNotes(),
  ]);
  return {
    format: "st-mina-json-backup",
    schemaVersion: 2,
    ts: new Date().toISOString(),
    groups,
    members,
    subs,
    activities,
    memberNotes,
  };
};

type SupabaseClient = ReturnType<typeof createBrowserSupabaseClient>;

// Wipe order: children first (FK constraints)
const wipeAllData = async (c: SupabaseClient) => {
  for (const [table, column] of [
    ["member_notes", "id"],
    ["attendance_records", "id"],
    ["attendance_sessions", "id"],
    ["member_activities", "member_id"],
    ["members", "id"],
    ["activities", "id"],
    ["groups", "id"],
  ] as const) {
    const { error } = await c.from(table).delete().not(column, "is", null);
    if (error) throw error;
  }
};

// Restores a snapshot exactly as exported — REPLACES all current business data.
// IDs are preserved so attendance/notes/member_activities references stay valid.
export const restoreSnapshot = async (snapshot: Snapshot, restoredBy: string): Promise<void> => {
  snapshot = validateSnapshot(snapshot);
  const c = createBrowserSupabaseClient();
  await wipeAllData(c);

  if (snapshot.groups.length) {
    const { error } = await c.from("groups").insert(
      snapshot.groups.map((g) => ({
        id: g.id,
        name: g.name,
        grade: g.grade,
        active: g.active,
        sort_order: g.sortOrder,
        main_servant: g.mainServant || null,
        assistant_servants: g.assistantServants || [],
        servant_contact: g.servantContact || null,
      }))
    );
    if (error) throw error;
  }

  if (snapshot.activities.length) {
    const { error } = await c.from("activities").insert(
      snapshot.activities.map((a) => ({
        id: a.id,
        name: a.name,
        icon: a.icon,
        color: a.color,
      }))
    );
    if (error) throw error;
  }

  if (snapshot.members.length) {
    const { error } = await c.from("members").insert(
      snapshot.members.map((m) => ({
        id: m.id,
        group_id: m.groupId,
        full_name: m.fullName,
        given_name: m.givenName || null,
        father_name: m.fatherName || null,
        phone: m.phone,
        family_phone: m.familyPhone,
        additional_family_phone: m.additionalFamilyPhone || null,
        address: m.address,
        school: m.school,
        birth_date: m.birthDate || null,
        notes: m.notes,
        active: m.active,
        joined_at: m.joinedAt,
        brother_of_lord: m.brotherOfLord || false,
        archived_at: m.archivedAt || null,
      }))
    );
    if (error) throw error;

    const links = snapshot.members.flatMap((m) =>
      (m.activityIds || []).map((activityId) => ({ member_id: m.id, activity_id: activityId }))
    );
    if (links.length) {
      const { error: linkError } = await c.from("member_activities").insert(links);
      if (linkError) throw linkError;
    }
  }

  // Restore attendance: sessions first, then records per session
  for (const sub of snapshot.subs) {
    const { data: session, error: sErr } = await c
      .from("attendance_sessions")
      .insert({ id: sub.id, attendance_date: sub.dateISO, created_by: sub.submittedBy || restoredBy })
      .select("id")
      .single();
    if (sErr) throw sErr;

    if (sub.records && sub.records.length > 0) {
      // Reconstruct column rows from the Arabic field keys
      const recordRows = sub.records.map((r) => ({
        session_id:       (session as { id: string }).id,
        member_id:        r.memberId,
        updated_by:       sub.submittedBy || restoredBy,
        service_attended:  Boolean(r["حضور الخدمة"]),
        mass_attended:     Boolean(r["حضور القداس"]),
        mass_service:      Boolean(r["خدمة القداس"]),
        confession:        Boolean(r["الأعتراف"]),
        phone_follow_up:   Boolean(r["الأفتقاد التيليفوني"]),
        home_follow_up:    Boolean(r["الأفتقاد المنزلي"]),
      }));
      const { error: rErr } = await c.from("attendance_records").insert(recordRows);
      if (rErr) throw rErr;
    }
  }

  if (snapshot.memberNotes.length) {
    const { error } = await c.from("member_notes").insert(snapshot.memberNotes);
    if (error) throw error;
  }
};
