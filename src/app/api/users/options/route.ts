import { NextResponse } from "next/server";
import { getUserManagementOptions } from "@/features/users/data/user-service";
import { isAuthorizationError } from "@/features/access-control/data/authorization-service";

export async function GET() {
  try {
    return NextResponse.json(await getUserManagementOptions());
  } catch (error) {
    const status = isAuthorizationError(error) ? error.status : 500;
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unexpected error",
    }, { status });
  }
}
