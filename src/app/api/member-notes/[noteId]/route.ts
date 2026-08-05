import { NextResponse } from "next/server";
import { isAuthorizationError } from "@/features/access-control/data/authorization-service";
import { deleteMemberNoteServer, updateMemberNoteServer } from "@/features/members/data/member-note-management-service";

const failure = (error: unknown) => NextResponse.json(
  { error: error instanceof Error ? error.message : "تعذر تنفيذ طلب الملاحظات." },
  { status: isAuthorizationError(error) ? error.status : typeof error === "object" && error && "issues" in error ? 400 : 500 },
);
export async function PUT(request: Request, { params }: { params: Promise<{ noteId: string }> }) {
  try { return NextResponse.json(await updateMemberNoteServer((await params).noteId, await request.json())); }
  catch (error) { return failure(error); }
}
export async function DELETE(_: Request, { params }: { params: Promise<{ noteId: string }> }) {
  try { await deleteMemberNoteServer((await params).noteId); return new NextResponse(null, { status: 204 }); }
  catch (error) { return failure(error); }
}
