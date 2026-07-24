import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { environment } from "@/infrastructure/config/environment";

interface CookieToSet { name: string; value: string; options: CookieOptions; }

export const createServerSupabaseClient = async () => {
  const store = await cookies();
  return createServerClient(environment.supabaseUrl(), environment.supabaseAnonKey(), {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (items: CookieToSet[]) => {
        try {
          items.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {}
      },
    },
  });
};

