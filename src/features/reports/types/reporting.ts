export interface ReportingGroup {
  id: string;
  name: string;
  grade: string;
  active: boolean;
  responsibleServants: string[];
}

export interface ReportingMember {
  id: string;
  groupId: string;
  fullName: string;
  givenName: string;
  fatherName: string;
  phone: string;
  familyPhone: string;
  additionalFamilyPhone: string;
  address: string;
  school: string;
  birthDate: string | null;
  joinedAt: string;
  active: boolean;
  archivedAt: string | null;
  brotherOfLord: boolean;
  activityNames: string[];
  responsibleServants: string[];
}

export interface ReportingAttendanceRecord {
  memberId: string;
  serviceAttended: boolean;
  massAttended: boolean;
  massService: boolean;
  confession: boolean;
  phoneFollowUp: boolean;
  homeFollowUp: boolean;
}

export interface ReportingAttendanceSession {
  id: string;
  date: string;
  createdAt: string;
  records: ReportingAttendanceRecord[];
}

export interface ReportingVisitation {
  id: string;
  memberId: string;
  visitedOn: string;
  typeCode: string;
  typeName: string;
  servantName: string;
  notes: string;
}

export interface ReportingDataset {
  generatedAt: string;
  canExport: boolean;
  defaultPeriod: {
    from: string;
    to: string;
    attendanceDate: string;
  } | null;
  groups: ReportingGroup[];
  members: ReportingMember[];
  sessions: ReportingAttendanceSession[];
  visitations: ReportingVisitation[];
  limitations: string[];
}
