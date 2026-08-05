import { NextResponse } from "next/server";
import { isAuthorizationError } from "@/features/access-control/data/authorization-service";
import {
  createServiceSettings,
  listServiceSettings,
} from "@/features/visitation/data/service-settings-service";

const failure = (error: unknown) => NextResponse.json({
  error: error instanceof Error ? error.message : "تعذر تنفيذ العملية.",
}, { status: isAuthorizationError(error) ? error.status
  : typeof error === "object" && error && "issues" in error ? 400 : 500 });

export async function GET() {
  try { return NextResponse.json(await listServiceSettings()); }
  catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  try { return NextResponse.json(await createServiceSettings(await request.json()), { status: 201 }); }
  catch (error) { return failure(error); }
}
