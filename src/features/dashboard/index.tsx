"use client";

import dynamic from "next/dynamic";

const LegacyApplication = dynamic(() => import("@/features/dashboard/LegacyApplication"), {
  ssr: false,
  loading: () => <p>جارٍ تحميل التطبيق…</p>,
});

export default function DashboardPage() {
  return <LegacyApplication />;
}
