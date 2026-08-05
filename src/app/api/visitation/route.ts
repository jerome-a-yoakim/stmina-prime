import { NextResponse } from "next/server";
import { isAuthorizationError } from "@/features/access-control/data/authorization-service";
import {
  createVisitation,
  getMeetingVisitationSnapshot,
  getMemberVisitationHistory,
  getVisitationDashboard,
} from "@/features/visitation/data/visitation-service";

const failure = (error: unknown) => {
  const status = isAuthorizationError(error) ? error.status
    : typeof error === "object" && error && "status" in error ? Number(error.status)
    : typeof error === "object" && error && "issues" in error ? 400 : 500;
  return NextResponse.json({
    error: error instanceof Error ? error.message : "تعذر تنفيذ العملية.",
  }, { status });
};

export async function GET(request: Request) {
  try {
    const memberId = new URL(request.url).searchParams.get("memberId");
    const meetingDate = new URL(request.url).searchParams.get("meetingDate");
    return NextResponse.json(memberId ? await getMemberVisitationHistory(memberId)
      : meetingDate ? await getMeetingVisitationSnapshot(meetingDate)
      : await getVisitationDashboard());
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    return NextResponse.json(await createVisitation(await request.json()), { status: 201 });
  } catch (error) {
    return failure(error);
  }
}
