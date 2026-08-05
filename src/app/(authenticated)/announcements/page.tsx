import { listAnnouncements } from "@/features/announcements/data/announcement-service";
import { AnnouncementManager } from "@/features/announcements/components/announcement-manager";
import { ManagementShell } from "@/features/users/components/management-shell";

export default async function AnnouncementsPage() {
  const data = await listAnnouncements();
  return (
    <ManagementShell title="الإعلانات">
      <AnnouncementManager initialAnnouncements={data.announcements} canManage={data.canManage} />
    </ManagementShell>
  );
}
