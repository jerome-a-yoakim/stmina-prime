import { NextResponse } from "next/server";
import {
  deleteServantFollowUpRecord,
  updateServantFollowUpRecord,
} from "@/features/servant-follow-up/data/follow-up-service";

const failure = (error: unknown) => NextResponse.json(
  { error: error instanceof Error ? error.message : "Unexpected error" },
  { status: typeof error === "object" && error && "status" in error ? Number(error.status) : 500 },
);

export async function PUT(request: Request, { params }: { params: Promise<{ recordId: string }> }) {
  try {
    return NextResponse.json(await updateServantFollowUpRecord((await params).recordId, await request.json()));
  } catch (error) { return failure(error); }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ recordId: string }> }) {
  try {
    await deleteServantFollowUpRecord((await params).recordId);
    return new NextResponse(null, { status: 204 });
  } catch (error) { return failure(error); }
}
