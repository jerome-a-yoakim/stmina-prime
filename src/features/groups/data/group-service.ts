import { createBrowserSupabaseClient } from "@/infrastructure/supabase/browser-client";
import type { Group } from "@/features/groups/types/group";

interface GroupRow {
  id: string;
  name: string;
  grade: string | null;
  active: boolean;
  sort_order: number;
  // Extended columns (added by migration 002 — may not exist yet)
  main_servant?: string | null;
  assistant_servants?: string[] | null;
  servant_contact?: string | null;
}

const map = (row: GroupRow): Group => ({
  id: row.id,
  name: row.name,
  grade: row.grade,
  active: row.active,
  sortOrder: row.sort_order,
  mainServant: row.main_servant || "",
  assistantServants: row.assistant_servants || [],
  servantContact: row.servant_contact || "",
} as Group);

// SELECT only columns that exist in the base schema (202607240001_initial_schema.sql).
// Extended servant-metadata columns (main_servant, assistant_servants, servant_contact)
// are added by migration 003. Until that migration is applied to the live database,
// selecting them will cause a Postgres "column does not exist" error that crashes
// the entire reload() call and blocks every page in the dashboard.
// After migration 003 is applied, restore:
//   "id,name,grade,active,sort_order,main_servant,assistant_servants,servant_contact"
const SELECT_COLUMNS = "id,name,grade,active,sort_order,main_servant,assistant_servants,servant_contact";


// Active-only groups (e.g. group picker dropdowns elsewhere).
export const listGroups = async (
  client = createBrowserSupabaseClient(),
): Promise<Group[]> => {

  const { data, error } = await client
    .from("groups")
    .select(SELECT_COLUMNS)
    .eq("active", true)
    .order("sort_order");

  if (error) throw error;

  return (data as unknown as GroupRow[]).map(map);
};

// Full roster (active + archived) — LegacyApplication filters active/archived
// itself client-side (groups.filter(g => g.active), archived-row styling,
// restore/archive toggles), so this must NOT filter by active.
export const listAllGroups = async (): Promise<Group[]> => {
  const client = createBrowserSupabaseClient();

  const { data, error } = await client
    .from("groups")
    .select(SELECT_COLUMNS)
    .order("sort_order");

  if (error) throw error;

  return (data as unknown as GroupRow[]).map(map);
};

export const getGroupById = async (id: string): Promise<Group | null> => {
  const client = createBrowserSupabaseClient();
  const { data, error } = await client
    .from("groups")
    .select(SELECT_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? map(data as unknown as GroupRow) : null;
};

export interface CreateGroupInput {
  name: string;
  grade?: string | null;
  mainServant?: string | null;
  assistantServants?: string[];
  servantContact?: string | null;
}

export const createGroup = async (input: CreateGroupInput): Promise<Group> => {
  const client = createBrowserSupabaseClient();

  // New groups are appended to the end of the ordering.
  const { count, error: countError } = await client
    .from("groups")
    .select("id", { count: "exact", head: true });
  if (countError) throw countError;

  const { data, error } = await client
    .from("groups")
    .insert({
      name: input.name,
      grade: input.grade ?? null,
      active: true,
      sort_order: count ?? 0,
      main_servant: input.mainServant ?? null,
      assistant_servants: input.assistantServants ?? [],
      servant_contact: input.servantContact ?? null,
    })
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw error;
  return map(data as unknown as GroupRow);
};

export interface UpdateGroupInput {
  name?: string;
  grade?: string | null;
  mainServant?: string | null;
  assistantServants?: string[];
  servantContact?: string | null;
  sortOrder?: number;
  active?: boolean;
}

export const updateGroup = async (id: string, patch: UpdateGroupInput): Promise<Group> => {
  const client = createBrowserSupabaseClient();

  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.grade !== undefined) row.grade = patch.grade;
  if (patch.mainServant !== undefined) row.main_servant = patch.mainServant;
  if (patch.assistantServants !== undefined) row.assistant_servants = patch.assistantServants;
  if (patch.servantContact !== undefined) row.servant_contact = patch.servantContact;
  if (patch.sortOrder !== undefined) row.sort_order = patch.sortOrder;
  if (patch.active !== undefined) row.active = patch.active;

  const { data, error } = await client
    .from("groups")
    .update(row)
    .eq("id", id)
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw error;
  return map(data as unknown as GroupRow);
};

// Archive/restore toggle used by LegacyApplication's archive & restore actions.
export const setGroupActive = async (id: string, active: boolean): Promise<Group> => {
  return updateGroup(id, { active });
};

// Hard delete — not currently called by LegacyApplication, provided for API
// completeness. Group deletion will fail on the FK from members.group_id
// unless the group has already been emptied; callers should reassign or
// archive members first.
export const deleteGroup = async (id: string): Promise<void> => {
  const client = createBrowserSupabaseClient();
  const { error } = await client.from("groups").delete().eq("id", id);
  if (error) throw error;
};
