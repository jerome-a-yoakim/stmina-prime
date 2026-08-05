import { ServiceModuleRoute } from "@/features/dashboard/components/service-module-route";
export default async function MemberPage({ params }: { params: Promise<{ id: string }> }) {
  return <ServiceModuleRoute module="members" memberId={(await params).id} />;
}
