import { createBrowserSupabaseClient } from "@/infrastructure/supabase/browser-client";
import { ROLE_DEFAULT_PERMISSIONS } from "@/features/auth/authorization/role-definitions";
import type { Permission, Role } from "@/features/auth/types/auth-types";

export interface BridgeUser {
  id: string;
  username: string;
  name: string;
  role: Role;
  permissions: Permission[];
  assignedGroups: string[];
  enabled: boolean;
  email: string;
}

export const getSupabaseUser = async (): Promise<BridgeUser | null> => {
  const supabase = createBrowserSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return null;

  const { data: account, error } = await supabase.from("users")
    .select("id, full_name, status_code")
    .eq("id", user.id).single();
  if (error || !account || account.status_code !== "active") return null;

  const [{ data: assignments }, { data: roleLinks }] = await Promise.all([
    supabase.from("user_class_assignments")
      .select("group_id, groups(name)").eq("user_id", user.id),
    supabase.from("user_roles")
      .select("roles(code)").eq("user_id", user.id),
  ]);
  const assignedGroups = ((assignments || []) as unknown as { groups: { name: string } | null }[])
    .map((item) => item.groups?.name || "").filter(Boolean);
  const codes = ((roleLinks || []) as unknown as { roles: { code: string } | null }[])
    .map((item) => item.roles?.code);
  const role: Role = codes.includes("system_owner") || codes.includes("system_manager")
    ? "admin"
    : codes.includes("service_coordinator") || codes.includes("main_servant") ? "class_leader"
      : codes.includes("secretary") ? "secretary" : "servant";

  return {
    id: user.id,
    username: user.email || user.id,
    name: account.full_name || user.email || "مستخدم",
    role,
    permissions: ROLE_DEFAULT_PERMISSIONS[role] || ROLE_DEFAULT_PERMISSIONS.servant,
    assignedGroups,
    enabled: true,
    email: user.email || "",
  };
};

export const supabaseSignOut = async (): Promise<void> => {
  await createBrowserSupabaseClient().auth.signOut();
};
