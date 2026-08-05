import { redirect } from "next/navigation";
import { requireActiveActor } from "@/features/access-control/data/authorization-service";
import { HomeDashboard } from "@/features/dashboard/components/home-dashboard";
import { getHomeDashboardData } from "@/features/dashboard/data/home-dashboard-service";

export default async function DashboardPage() {
  const actor = await requireActiveActor();
  if (!actor.permissions.includes("reports.read")) redirect("/dashboard/me");
  const data = await getHomeDashboardData(actor);
  return <HomeDashboard data={data} />;
}
