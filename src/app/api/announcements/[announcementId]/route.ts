import { NextResponse } from "next/server";
import { isAuthorizationError } from "@/features/access-control/data/authorization-service";
import { deleteAnnouncement, updateAnnouncement } from "@/features/announcements/data/announcement-service";

const failure = (error: unknown) => NextResponse.json({ error: error instanceof Error ? error.message : "تعذر تنفيذ العملية." },
  { status: isAuthorizationError(error) ? error.status : typeof error === "object" && error && "issues" in error ? 400 : 500 });

export async function PUT(request: Request, { params }: { params: Promise<{ announcementId: string }> }) {
  try { return NextResponse.json(await updateAnnouncement((await params).announcementId, await request.json())); }
  catch (error) { return failure(error); }
}
export async function DELETE(_: Request, { params }: { params: Promise<{ announcementId: string }> }) {
  try { await deleteAnnouncement((await params).announcementId); return new NextResponse(null, { status: 204 }); }
  catch (error) { return failure(error); }
}

