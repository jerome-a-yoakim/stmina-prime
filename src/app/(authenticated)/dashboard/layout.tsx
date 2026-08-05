import type { ReactNode } from "react";
import { requireActiveActor } from "@/features/access-control/data/authorization-service";
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const actor = await requireActiveActor();
  const canManageServantFollowUp =
    actor.roles.includes("system_owner") || actor.roles.includes("system_manager");
  const canViewVisitation = actor.permissions.includes("member_follow_up.read");
  const canViewAllNotifications = actor.roles.includes("system_owner") || actor.roles.includes("system_manager");
  return <DashboardShell userId={actor.id} userName={actor.fullName}
    canManageServantFollowUp={canManageServantFollowUp}
    canViewVisitation={canViewVisitation} canViewAllNotifications={canViewAllNotifications}>{children}</DashboardShell>;
}
