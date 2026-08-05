/**
 * Browser (client-component) Supabase client.
 *
 * Use ONLY in Client Components ("use client").
 * Never import this in Server Components, Route Handlers, or Middleware.
 *
 * IMPORTANT: process.env.NEXT_PUBLIC_* must be referenced as LITERAL strings
 * here (not via a wrapper function) so that Next.js can statically inline
 * the values into the client bundle at compile time.
 */
import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl) {
  throw new Error(
    '[Supabase Config] Missing required environment variable: "NEXT_PUBLIC_SUPABASE_URL". ' +
      "Please add it to your .env.local file."
  );
}
if (!supabaseKey) {
  throw new Error(
    '[Supabase Config] Missing required environment variable: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY". ' +
      "Please add it to your .env.local file."
  );
}

let browserClient: ReturnType<typeof createBrowserClient<any>> | undefined;

export const createBrowserSupabaseClient = () => {
  if (typeof window === "undefined") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return createBrowserClient<any>(supabaseUrl, supabaseKey);
  }
  if (!browserClient) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    browserClient = createBrowserClient<any>(supabaseUrl, supabaseKey);
  }
  return browserClient;
};

