import type { PermissionCode, SystemRoleCode } from "@/features/access-control/types/access-control";
import type { ReportingDataset } from "@/features/reports/types/reporting";

export interface HomeSpiritualMessage {
  text: string;
  reference: string;
}

export interface HomeDashboardData {
  actor: {
    fullName: string;
    roles: SystemRoleCode[];
    permissions: PermissionCode[];
    classIds: string[];
  };
  reporting: ReportingDataset;
  today: string;
  currentHour: number;
  meetingWeekday: number | null;
  spiritualMessage: HomeSpiritualMessage | null;
}
