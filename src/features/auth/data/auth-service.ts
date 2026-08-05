/**
 * Application-layer auth service.
 *
 * Called ONLY by Route Handlers (server context).
 * Uses the server Supabase client so session cookies are properly
 * written to the HTTP response.
 */
import { createServerSupabaseClient } from "@/infrastructure/supabase/server-client";
import { getAdminClient } from "@/infrastructure/supabase/admin-client";

export const signIn = async (email: string, password: string, rememberMe = false) => {
  const supabase = await createServerSupabaseClient(rememberMe);
  const result = await supabase.auth.signInWithPassword({ email, password });
  if (result.error || !result.data.user) return result;
  const admin = getAdminClient();
  const { data: account, error } = await admin.from("users")
    .select("status_code, account_statuses(allows_login)")
    .eq("id", result.data.user.id).maybeSingle();
  const lifecycle = account?.account_statuses as unknown as { allows_login: boolean } | null;
  if (error || !account || !lifecycle?.allows_login) {
    await supabase.auth.signOut();
    return { data: { user: null, session: null }, error: new Error("Account is not active") };
  }
  const occurredAt = new Date().toISOString();
  await Promise.all([
    admin.from("users").update({ last_login_at: occurredAt }).eq("id", result.data.user.id),
    admin.from("user_login_events").insert({
      user_id: result.data.user.id, occurred_at: occurredAt, success: true,
    }),
  ]);
  return result;
};

export const signOut = async () => {
  const supabase = await createServerSupabaseClient();
  return supabase.auth.signOut();
};
