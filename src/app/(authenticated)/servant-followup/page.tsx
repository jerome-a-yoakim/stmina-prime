import {
  listAllServantFollowUpRecords,
  listServantFollowUpDays,
} from "@/features/servant-follow-up/data/follow-up-service";
import { listUsers } from "@/features/users/data/user-service";
import { ServantFollowUpManager } from "@/features/servant-follow-up/components/servant-follow-up-manager";
import { ManagementShell } from "@/features/users/components/management-shell";

export default async function ServantFollowUpPage() {
  const [rows, dates, users] = await Promise.all([
    listAllServantFollowUpRecords(),
    listServantFollowUpDays(),
    listUsers(),
  ]);
  const activeUsers = users.filter((user) => user.status_code === "active");
  return (
    <ManagementShell title="متابعة الخدام">
      <p className="management-note">سجل الحاضرين والمُعدّين فقط؛ القيم غير المسجلة تُحسب غيابًا تلقائيًا.</p>
      <ServantFollowUpManager
        initialRows={rows}
        initialDates={dates}
        users={activeUsers.map(({ id, full_name }) => ({ id, full_name }))}
      />
    </ManagementShell>
  );
}
