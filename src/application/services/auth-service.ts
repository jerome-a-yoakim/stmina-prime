import { createServerSupabaseClient } from "@/infrastructure/supabase/server-client";
export const signIn = async (email: string, password: string) => { const supabase = await createServerSupabaseClient(); return supabase.auth.signInWithPassword({ email, password }); };
export const signOut = async () => { const supabase = await createServerSupabaseClient(); return supabase.auth.signOut(); };
