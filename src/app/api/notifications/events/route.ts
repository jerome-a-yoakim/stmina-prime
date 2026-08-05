import { NextResponse } from "next/server";
import { requireActiveActor, isAuthorizationError } from "@/features/access-control/data/authorization-service";
import { PermissionDeniedError } from "@/features/access-control/types/access-control";
import { notifyAttendanceSubmitted } from "@/features/notifications/data/notification-service";

export async function POST(request: Request) {
  try {
    const actor = await requireActiveActor();
    if (!actor.permissions.includes("member_attendance.write")) {
      throw new PermissionDeniedError("member_attendance.write");
    }
    const body = await request.json() as { event?: string; sessionId?: string };
    if (body.event !== "attendance.submitted" || !body.sessionId) {
      return NextResponse.json({ error: "حدث الإشعار غير صالح." }, { status: 400 });
    }
    await notifyAttendanceSubmitted(body.sessionId, actor.id, actor.fullName);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "تعذر إنشاء الإشعار." },
      { status: isAuthorizationError(error) ? error.status : 500 });
  }
}
