import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { environment } from "@/infrastructure/config/environment";
import { ADMIN_SESSION_COOKIE, administratorSessionCookieOptions,
  createAdministratorSession } from "@/features/auth/data/administrator-session";

export const runtime = "nodejs";

function codesMatch(candidate: unknown): boolean {
  if (typeof candidate !== "string") return false;
  const entered = Buffer.from(candidate, "utf8");
  const expected = Buffer.from(environment.adminMasterCode(), "utf8");
  return entered.length === expected.length && timingSafeEqual(entered, expected);
}

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { body = null; }
  const code = body && typeof body === "object" && "code" in body
    ? (body as { code?: unknown }).code : undefined;
  if (!codesMatch(code)) {
    return NextResponse.json({ error: "رمز الدخول غير صحيح" }, { status: 401 });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, await createAdministratorSession(),
    administratorSessionCookieOptions);
  return response;
}
