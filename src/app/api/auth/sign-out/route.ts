import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { signOut } from "@/features/auth/data/auth-service";
import { ADMIN_SESSION_COOKIE, isAdministratorSession } from "@/features/auth/data/administrator-session";

export async function POST() {
  const store = await cookies();
  const administratorSession = await isAdministratorSession(store.get(ADMIN_SESSION_COOKIE)?.value);
  if (!administratorSession) await signOut();
  store.delete(ADMIN_SESSION_COOKIE);
  store.delete("remember_session");
  return NextResponse.json({ ok: true });
}
