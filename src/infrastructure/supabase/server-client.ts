/**
 * Server Supabase client.
 *
 * Use in Server Components, Route Handlers, and Server Actions.
 * Never import this in Client Components ("use client").
 */
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { environment } from "@/infrastructure/config/environment";

export const createServerSupabaseClient = async (persistentSession = true) => {
  const store = await cookies();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createServerClient<any>(
    environment.supabaseUrl(),
    environment.supabasePublishableKey(),
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (items: { name: string; value: string; options: CookieOptions }[]) => {
          try {
            items.forEach(({ name, value, options }) => {
              const cookieOptions = persistentSession
                ? options
                : { ...options, maxAge: undefined, expires: undefined };
              store.set(name, value, cookieOptions);
            });
          } catch {
            // setAll may throw in read-only server contexts (e.g. RSC without
            // an active write phase). The error is intentionally swallowed here
            // because the session refresh still succeeds on the next request.
          }
        },
      },
    }
  );
};
