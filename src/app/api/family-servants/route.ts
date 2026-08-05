import { NextResponse } from "next/server";
import { isAuthorizationError } from "@/features/access-control/data/authorization-service";
import { listResponsibleServantAssignments } from "@/features/users/data/responsible-servant-service";

export async function GET() {
  try {
    return NextResponse.json(await listResponsibleServantAssignments());
  } catch (error) {
    if (isAuthorizationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load servant assignments" }, { status: 500 });
  }
}
