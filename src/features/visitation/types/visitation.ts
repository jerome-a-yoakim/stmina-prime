export type AbsenceStatus = "danger" | "critical" | "important" | "regular";

export interface ServiceWeek {
  id: string;
  startDate: string;
  endDate: string;
  meetingDate: string;
  status: "OPEN" | "CLOSED";
  closedAt: string | null;
}

export interface VisitationType {
  id: string;
  code: string;
  nameAr: string;
  icon: string;
  color: string;
  sortOrder: number;
}

export interface VisitationRecord {
  id: string;
  memberId: string;
  serviceWeekId: string;
  typeId: string;
  typeCode: string;
  typeName: string;
  typeIcon: string;
  visitedOn: string;
  notes: string;
  servantId: string;
  servantName: string;
  createdAt: string;
  createdBy: string;
  updatedBy: string;
  updatedAt: string;
  version: number;
}

export interface VisitationMember {
  id: string;
  name: string;
  groupId: string;
  groupName: string;
  grade: string;
  responsibleServant: string;
  consecutiveAbsences: number;
  status: AbsenceStatus;
  lastAttendance: string | null;
  currentVisitations: VisitationRecord[];
  lastNote: string | null;
}

export interface VisitationDashboardData {
  currentWeek: ServiceWeek;
  canRecord: boolean;
  today: string;
  types: VisitationType[];
  members: VisitationMember[];
}

export interface ServiceSettings {
  id: string;
  timezone: string;
  meetingWeekday: number;
  meetingTime: string;
  attendanceDeadline: string;
  allowVisitationAfterMeeting: boolean;
  automaticWeekRollover: boolean;
  effectiveFrom: string;
  updatedBy: string;
  updatedAt: string;
}
