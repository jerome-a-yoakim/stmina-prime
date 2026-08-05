import { NextResponse } from "next/server";
import { isAuthorizationError } from "@/features/access-control/data/authorization-service";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/features/notifications/data/notification-service";

const failure = (error: unknown) => NextResponse.json(
  { error: error instanceof Error ? error.message : "تعذر تنفيذ طلب الإشعارات." },
  { status: isAuthorizationError(error) ? error.status : 500 },
);

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    return NextResponse.json(await listNotifications({ all: url.searchParams.get("scope") === "all" }));
  } catch (error) { return failure(error); }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json() as { id?: string; all?: boolean };
    if (body.all) { await markAllNotificationsRead(); return NextResponse.json({ ok: true }); }
    if (!body.id) return NextResponse.json({ error: "معرّف الإشعار مطلوب." }, { status: 400 });
    return NextResponse.json(await markNotificationRead(body.id));
  } catch (error) { return failure(error); }
}
