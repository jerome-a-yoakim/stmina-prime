import { createBrowserSupabaseClient } from "@/infrastructure/supabase/browser-client";
import type { Member } from "@/features/members/types/member";

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

const map = (r: MemberRow, activityIds: string[] = []): Member => ({
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

type SupabaseClient = ReturnType<typeof createBrowserSupabaseClient>;

// Batches activityIds for a set of member rows via the member_activities join
// table, so every listing function returns the same shape (mirrors the join
// logic already used in backup-service's fetchAllMembers).
const withActivityIds = async (client: SupabaseClient, rows: MemberRow[]): Promise<Member[]> => {
  if (!rows.length) return [];
  const ids = rows.map(r => r.id);
  const { data: links, error } = await client
    .from("member_activities")
    .select("member_id, activity_id")
    .in("member_id", ids);
  if (error) throw error;

  const byMember = new Map<string, string[]>();
  (links || []).forEach((l: { member_id: string; activity_id: string }) => {
    const list = byMember.get(l.member_id) || [];
    list.push(l.activity_id);
    byMember.set(l.member_id, list);
  });

  return rows.map(r => map(r, byMember.get(r.id) || []));
};

// Active-only members, optionally scoped to a group (e.g. group pickers).
export const listMembers = async (
  groupId?: string,
  client = createBrowserSupabaseClient(),
): Promise<Member[]> => {
  let q = client.from("members").select("*").eq("active", true).order("full_name");
  if (groupId) q = q.eq("group_id", groupId);
  const { data, error } = await q;
  if (error) throw error;
  return withActivityIds(client, data as unknown as MemberRow[]);
};

// Full roster (active + archived) — LegacyApplication filters active/archived
// itself client-side (members.filter(m => !m.active) for the archive tab,
// archived-row styling, restore/delete actions), so this must NOT filter by
// active.
export const listAllMembers = async (): Promise<Member[]> => {
  const client = createBrowserSupabaseClient();
  const { data, error } = await client.from("members").select("*").order("full_name");
  if (error) throw error;
  return withActivityIds(client, data as unknown as MemberRow[]);
};

export const getMemberById = async (id: string): Promise<Member | null> => {
  const client = createBrowserSupabaseClient();
  const { data, error } = await client.from("members").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [member] = await withActivityIds(client, [data as unknown as MemberRow]);
  return member;
};

export interface CreateMemberInput {
  groupId: string;
  fullName: string;
  givenName?: string | null;
  fatherName?: string | null;
  phone?: string | null;
  familyPhone?: string | null;
  additionalFamilyPhone?: string | null;
  address?: string | null;
  school?: string | null;
  birthDate?: string | null;
  notes?: string | null;
  brotherOfLord?: boolean;
}

export const createMember = async (input: CreateMemberInput): Promise<Member> => {
  const client = createBrowserSupabaseClient();
  const structuredName = input.givenName?.trim() && input.fatherName?.trim()
    ? `${input.givenName.trim()} ${input.fatherName.trim()}`.replace(/\s+/g, " ")
    : input.fullName.trim();
  const { data, error } = await client
    .from("members")
    .insert({
      group_id: input.groupId,
      full_name: structuredName,
      given_name: input.givenName ?? null,
      father_name: input.fatherName ?? null,
      phone: input.phone ?? null,
      family_phone: input.familyPhone ?? null,
      additional_family_phone: input.additionalFamilyPhone ?? null,
      address: input.address ?? null,
      school: input.school ?? null,
      birth_date: input.birthDate ?? null,
      notes: input.notes ?? null,
      brother_of_lord: input.brotherOfLord ?? false,
      active: true,
    })
    .select("*")
    .single();
  if (error) throw error;
  return map(data as unknown as MemberRow, []);
};

export interface UpdateMemberInput {
  fullName?: string;
  givenName?: string | null;
  fatherName?: string | null;
  groupId?: string;
  phone?: string | null;
  familyPhone?: string | null;
  additionalFamilyPhone?: string | null;
  address?: string | null;
  school?: string | null;
  birthDate?: string | null;
  notes?: string | null;
  brotherOfLord?: boolean;
  active?: boolean;
}

export const updateMember = async (id: string, patch: UpdateMemberInput): Promise<Member> => {
  const client = createBrowserSupabaseClient();

  const row: Record<string, unknown> = {};
  if (patch.fullName !== undefined) row.full_name = patch.fullName;
  if (patch.givenName !== undefined) row.given_name = patch.givenName;
  if (patch.fatherName !== undefined) row.father_name = patch.fatherName;
  if (patch.groupId !== undefined) row.group_id = patch.groupId;
  if (patch.phone !== undefined) row.phone = patch.phone;
  if (patch.familyPhone !== undefined) row.family_phone = patch.familyPhone;
  if (patch.additionalFamilyPhone !== undefined) row.additional_family_phone = patch.additionalFamilyPhone;
  if (patch.address !== undefined) row.address = patch.address;
  if (patch.school !== undefined) row.school = patch.school;
  if (patch.birthDate !== undefined) row.birth_date = patch.birthDate;
  if (patch.notes !== undefined) row.notes = patch.notes;
  if (patch.brotherOfLord !== undefined) row.brother_of_lord = patch.brotherOfLord;
  if (patch.active !== undefined) row.active = patch.active;

  const { data, error } = await client
    .from("members")
    .update(row)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;

  const [member] = await withActivityIds(client, [data as unknown as MemberRow]);
  return member;
};

// Soft-delete: marks the member inactive and stamps archivedAt, without
// touching attendance history or notes.
export const archiveMember = async (id: string): Promise<Member> => {
  const client = createBrowserSupabaseClient();
  const { data: authData } = await client.auth.getUser();
  const { data, error } = await client
    .from("members")
    .update({ active: false, archived_at: new Date().toISOString(), archived_by: authData.user?.id || null })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  const [member] = await withActivityIds(client, [data as unknown as MemberRow]);
  return member;
};

export const restoreMember = async (id: string): Promise<Member> => {
  const client = createBrowserSupabaseClient();
  const { data, error } = await client
    .from("members")
    .update({ active: true, archived_at: null, archived_by: null })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  const [member] = await withActivityIds(client, [data as unknown as MemberRow]);
  return member;
};

// Hard delete — removes the member and every row that references them
// (notes, activity links) before removing the member itself, since those
// foreign keys are not guaranteed to cascade.
export const deleteMemberPermanently = async (id: string): Promise<void> => {
  const client = createBrowserSupabaseClient();
  const { count, error: historyError } = await client.from("member_visitation_records")
    .select("id", { count: "exact", head: true }).eq("member_id", id);
  if (historyError) throw historyError;
  if ((count || 0) > 0) {
    throw new Error("لا يمكن حذف المخدوم نهائيًا لأن له سجل افتقاد دائم. احتفظ به في الأرشيف.");
  }
  await client.from("member_notes").delete().eq("member_id", id);
  await client.from("member_activities").delete().eq("member_id", id);
  const { error } = await client.from("members").delete().eq("id", id);
  if (error) throw error;
};

// Replaces a member's activity links entirely with the given set.
export const setMemberActivities = async (id: string, activityIds: string[]): Promise<void> => {
  const client = createBrowserSupabaseClient();
  const { error: deleteError } = await client.from("member_activities").delete().eq("member_id", id);
  if (deleteError) throw deleteError;

  if (activityIds.length) {
    const { error: insertError } = await client
      .from("member_activities")
      .insert(activityIds.map(activityId => ({ member_id: id, activity_id: activityId })));
    if (insertError) throw insertError;
  }
};
