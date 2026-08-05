/**
 * Centralized environment variable access.
 *
 * This is the ONLY file in the project that may read process.env directly.
 * All other files must import from this module.
 *
 * Convention (latest Supabase SSR):
 *   NEXT_PUBLIC_SUPABASE_URL              – Supabase project URL
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY  – Publishable (anon) key (new name)
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY         – Legacy alias kept for backward compat
 *   SUPABASE_SERVICE_ROLE_KEY             – Service-role key (server-only)
 */

const required = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `[Supabase Config] Missing required environment variable: "${name}". ` +
        `Please add it to your .env.local file.`
    );
  }
  return value;
};

const optional = (name: string): string | undefined => process.env[name];

export const environment = {
  /** Supabase project URL — NEXT_PUBLIC_SUPABASE_URL */
  supabaseUrl: (): string => required("NEXT_PUBLIC_SUPABASE_URL"),

  /**
   * Publishable (anon) key.
   * Prefers NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (new convention).
   * Falls back to NEXT_PUBLIC_SUPABASE_ANON_KEY for backward compatibility.
   */
  supabasePublishableKey: (): string => {
    const newKey = optional("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    if (newKey) return newKey;
    const legacyKey = optional("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    if (legacyKey) return legacyKey;
    throw new Error(
      `[Supabase Config] Missing publishable key. ` +
        `Set "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" (or the legacy "NEXT_PUBLIC_SUPABASE_ANON_KEY") ` +
        `in your .env.local file.`
    );
  },

  /**
   * Service-role key — server-side only.
   * Only call this from Route Handlers or Server Actions; never from client code.
   */
  supabaseServiceRoleKey: (): string => required("SUPABASE_SERVICE_ROLE_KEY"),

  /** Emergency administrator code. Server-side use only. */
  adminMasterCode: (): string => required("ADMIN_MASTER_CODE"),

  /**
   * @deprecated Use supabasePublishableKey() instead.
   * Kept so that any legacy callers (outside this refactor) continue to work.
   */
  supabaseAnonKey: (): string => environment.supabasePublishableKey(),
} as const;
