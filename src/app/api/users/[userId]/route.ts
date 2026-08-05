import { NextResponse } from "next/server";
import { getUserProfile, updateUser } from "@/features/users/data/user-service";
import { isAuthorizationError } from "@/features/access-control/data/authorization-service";

const failure = (error: unknown) => {
  if (isAuthorizationError(error)) return NextResponse.json({ error: error.message }, { status: error.status });
  return NextResponse.json({ error: error instanceof Error ? error.message : "Unexpected error" }, { status: 500 });
};

export async function GET(_request: Request, context: { params: Promise<{ userId: string }> }) {
  try { return NextResponse.json(await getUserProfile((await context.params).userId)); }
  catch (error) { return failure(error); }
}

export async function PATCH(request: Request, context: { params: Promise<{ userId: string }> }) {
  try { return NextResponse.json(await updateUser((await context.params).userId, await request.json())); }
  catch (error) { return failure(error); }
}
