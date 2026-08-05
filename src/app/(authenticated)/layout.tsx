import type { ReactNode } from "react";
import { requireActiveActor } from "@/features/access-control/data/authorization-service";
import { AppShell } from "@/features/app-shell/components/app-shell";

export default async function AuthenticatedLayout({ children }: { children: ReactNode }) {
  const actor = await requireActiveActor();
  const canManageServantFollowUp =
    actor.roles.includes("system_owner") || actor.roles.includes("system_manager");
  const canViewVisitation = actor.permissions.includes("member_follow_up.read");
  const canViewAllNotifications = canManageServantFollowUp;

  return (
    <AppShell
      userId={actor.id}
      userName={actor.fullName}
      canManageServantFollowUp={canManageServantFollowUp}
      canViewVisitation={canViewVisitation}
      canViewAllNotifications={canViewAllNotifications}
    >
      {children}
    </AppShell>
  );
}
