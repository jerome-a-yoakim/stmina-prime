import { NextResponse } from "next/server";
import { signInSchema } from "@/features/auth/schemas/sign-in-schema";
import { signIn } from "@/features/auth/data/auth-service";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const parsed = signInSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid credentials format" }, { status: 400 });
  }

  const { error } = await signIn(parsed.data.email, parsed.data.password, parsed.data.rememberMe);
  if (error) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const store = await cookies();
  store.set("remember_session", parsed.data.rememberMe ? "1" : "0", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(parsed.data.rememberMe ? { maxAge: 60 * 60 * 24 * 365 } : {}),
  });
  return NextResponse.json({ ok: true });
}
