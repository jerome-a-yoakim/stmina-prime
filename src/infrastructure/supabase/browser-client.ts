import { createBrowserClient } from "@supabase/ssr";
import { environment } from "@/infrastructure/config/environment";
export const createBrowserSupabaseClient = () => createBrowserClient(environment.supabaseUrl(), environment.supabaseAnonKey());
