import { NextResponse } from "next/server";
import {
  createServantFollowUpRecord,
  listAllServantFollowUpRecords,
  saveServantFollowUpDay,
} from "@/features/servant-follow-up/data/follow-up-service";

const failure = (error: unknown) => NextResponse.json(
  { error: error instanceof Error ? error.message : "Unexpected error" },
  { status: typeof error === "object" && error && "status" in error ? Number(error.status) : 500 },
);

export async function GET() {
  try { return NextResponse.json(await listAllServantFollowUpRecords()); }
  catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  try {
    return NextResponse.json(await createServantFollowUpRecord(await request.json()), { status: 201 });
  } catch (error) { return failure(error); }
}

export async function PUT(request: Request) {
  try {
    return NextResponse.json(await saveServantFollowUpDay(await request.json()));
  } catch (error) { return failure(error); }
}
