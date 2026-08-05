import { ServiceModuleRoute } from "@/features/dashboard/components/service-module-route";

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ServiceModuleRoute module="members" memberId={id} />;
}
