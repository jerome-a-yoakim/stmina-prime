import { redirect } from "next/navigation";

export default function LegacyHomeDashboardPage() {
  redirect("/dashboard");
}
