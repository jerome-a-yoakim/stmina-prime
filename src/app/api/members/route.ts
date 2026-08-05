import { NextResponse } from "next/server";
import { createMember, listMembers } from "@/features/members/data/member-service";
import { memberSchema } from "@/features/members/schemas/member-schema";
import { createServerSupabaseClient } from "@/infrastructure/supabase/server-client";

export async function GET(request: Request) {
  try {
    const client = await createServerSupabaseClient();
    const groupId = new URL(request.url).searchParams.get("groupId") ?? undefined;
    return NextResponse.json(await listMembers(groupId, client));
  } catch {
    return NextResponse.json({ error: "Unable to load members" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid member data" }, { status: 400 });
  }
  const parsed = memberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid member data" }, { status: 400 });
  }
  try {
    return NextResponse.json(await createMember(parsed.data));
  } catch {
    return NextResponse.json({ error: "Unable to create member" }, { status: 500 });
  }
}
