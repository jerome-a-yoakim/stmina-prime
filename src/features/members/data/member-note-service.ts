export interface MemberNote {
  id: string; memberId: string; title: string; content: string; category: string;
  isImportant: boolean; createdBy: string | null; createdAt: string; updatedAt: string;
}
interface MemberNoteRow {
  id: string; member_id: string; title: string; content: string; category: string;
  is_important: boolean; created_by: string | null; created_at: string; updated_at: string;
}
const map = (row: MemberNoteRow): MemberNote => ({
  id: row.id, memberId: row.member_id, title: row.title, content: row.content,
  category: row.category, isImportant: row.is_important, createdBy: row.created_by,
  createdAt: row.created_at, updatedAt: row.updated_at,
});
const parse = async (response: Response) => {
  const body = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(body?.error || "تعذر حفظ الملاحظة.");
  return body;
};
export const listNotesForMember = async (memberId: string): Promise<MemberNote[]> =>
  (await parse(await fetch(`/api/member-notes?memberId=${encodeURIComponent(memberId)}`, { cache: "no-store" }))).map(map);
export interface CreateMemberNoteInput {
  memberId: string; title: string; content: string; category: string; isImportant?: boolean; createdBy?: string | null;
}
export const createMemberNote = async (input: CreateMemberNoteInput): Promise<MemberNote> => map(await parse(await fetch("/api/member-notes", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input),
})));
export interface UpdateMemberNoteInput { title?: string; content?: string; category?: string; isImportant?: boolean; }
export const updateMemberNote = async (id: string, patch: UpdateMemberNoteInput): Promise<MemberNote> => map(await parse(await fetch(`/api/member-notes/${id}`, {
  method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch),
})));
export const deleteMemberNote = async (id: string): Promise<void> => { await parse(await fetch(`/api/member-notes/${id}`, { method: "DELETE" })); };
