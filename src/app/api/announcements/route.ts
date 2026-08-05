import { NextResponse } from "next/server";
import { isAuthorizationError } from "@/features/access-control/data/authorization-service";
import { createAnnouncement, listAnnouncements } from "@/features/announcements/data/announcement-service";

const failure = (error: unknown) => NextResponse.json({ error: error instanceof Error ? error.message : "تعذر تنفيذ العملية." },
  { status: isAuthorizationError(error) ? error.status : typeof error === "object" && error && "issues" in error ? 400 : 500 });

export async function GET() {
  try { return NextResponse.json(await listAnnouncements()); } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try { return NextResponse.json(await createAnnouncement(await request.json()), { status: 201 }); }
  catch (error) { return failure(error); }
}

