import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createUser, listUsers } from "@/features/users/data/user-service";
import { isAuthorizationError } from "@/features/access-control/data/authorization-service";

function failure(error: unknown) {
  if (isAuthorizationError(error)) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof ZodError) return NextResponse.json({ error: "Invalid user data", details: error.flatten() }, { status: 400 });
  const message = error instanceof Error ? error.message : "Unexpected error";
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function GET() {
  try { return NextResponse.json(await listUsers()); } catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  try {
    return NextResponse.json(await createUser(await request.json()), { status: 201 });
  } catch (error) { return failure(error); }
}
