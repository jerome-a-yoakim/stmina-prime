import { type NextRequest } from "next/server";
import { updateSession } from "@/infrastructure/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image  (image optimization)
     * - favicon.ico
     * - api routes (they handle their own auth)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/).*)",
  ],
};
