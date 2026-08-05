"use client";

import dynamic from "next/dynamic";

const DashboardApplication = dynamic(() => import("@/features/dashboard/components/dashboard-application"), {
  ssr: false,
  loading: () => <p>جارٍ تحميل التطبيق…</p>,
});

export default function DashboardPage() {
  return <DashboardApplication />;
}
