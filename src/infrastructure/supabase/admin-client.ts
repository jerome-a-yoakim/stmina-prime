/**
 * Supabase Admin Client
 *
 * Uses the service-role key to bypass RLS for administrative operations
 * (listing all users, creating users via the Auth Admin API, etc.)
 *
 * NEVER import this in Client Components or expose it to the browser.
 * ONLY use in server contexts: Route Handlers, Server Actions.
 */
import { createClient } from "@supabase/supabase-js";
import { environment } from "@/infrastructure/config/environment";

// The database evolves through SQL migrations in this repository. A generated
// Database type can replace this boundary after the migration is deployed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _adminClient: ReturnType<typeof createClient<any>> | null = null;

export const getAdminClient = () => {
  if (!_adminClient) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _adminClient = createClient<any>(
      environment.supabaseUrl(),
      environment.supabaseServiceRoleKey(),
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }
  return _adminClient;
};
