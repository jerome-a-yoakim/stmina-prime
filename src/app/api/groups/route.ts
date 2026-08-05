import { NextResponse } from "next/server";
import { listGroups } from "@/features/groups/data/group-service";
import { createServerSupabaseClient } from "@/infrastructure/supabase/server-client";

export async function GET() {
  try {
    const client = await createServerSupabaseClient();
    return NextResponse.json(await listGroups(client));
  } catch {
    return NextResponse.json({ error: "Unable to load groups" }, { status: 500 });
  }
}
