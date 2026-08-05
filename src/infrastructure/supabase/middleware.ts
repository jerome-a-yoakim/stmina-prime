/**
 * Middleware Supabase client helper.
 *
 * Used exclusively by the root middleware.ts to refresh the user session on
 * every request and enforce route-level auth redirects.
 *
 * Never import this in Client Components or Server Components.
 */
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { environment } from "@/infrastructure/config/environment";
import { ADMIN_SESSION_COOKIE, isAdministratorSession } from "@/features/auth/data/administrator-session";

export const updateSession = async (request: NextRequest) => {
  let response = NextResponse.next({ request });
  const administratorSession = await isAdministratorSession(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
  const persistentSession = request.cookies.get("remember_session")?.value === "1";

  const supabase = createServerClient(
    environment.supabaseUrl(),
    environment.supabasePublishableKey(),
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (items: { name: string; value: string; options: CookieOptions }[]) => {
          items.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          items.forEach(({ name, value, options }) => {
            const cookieOptions = persistentSession
              ? options
              : { ...options, maxAge: undefined, expires: undefined };
            response.cookies.set(name, value, cookieOptions);
          });
        },
      },
    }
  );

  // Refresh the session — do NOT use getSession() here; getUser() makes a
  // network call and is the only reliable way to validate the token server-side.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Auth redirects
  if (!user && !administratorSession && (
    request.nextUrl.pathname.startsWith("/dashboard") ||
    request.nextUrl.pathname.startsWith("/home")
  )) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if ((user || administratorSession) && (
    request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/administrator-login"
  )) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
};
