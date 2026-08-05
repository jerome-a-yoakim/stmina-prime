import { NextResponse } from "next/server";
import { isAuthorizationError } from "@/features/access-control/data/authorization-service";
import { createMemberNoteServer, listMemberNotes } from "@/features/members/data/member-note-management-service";

const failure = (error: unknown) => NextResponse.json(
  { error: error instanceof Error ? error.message : "تعذر تنفيذ طلب الملاحظات." },
  { status: isAuthorizationError(error) ? error.status : typeof error === "object" && error && "issues" in error ? 400 : 500 },
);
export async function GET(request: Request) {
  try {
    const memberId = new URL(request.url).searchParams.get("memberId");
    if (!memberId) return NextResponse.json({ error: "معرّف المخدوم مطلوب." }, { status: 400 });
    return NextResponse.json(await listMemberNotes(memberId));
  } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try { return NextResponse.json(await createMemberNoteServer(await request.json()), { status: 201 }); }
  catch (error) { return failure(error); }
}
