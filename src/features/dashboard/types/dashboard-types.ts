export interface FieldDefinition {
  key: string;
  icon: string;
  color: string;
}

export interface VisitationReadonlyField extends FieldDefinition {
  label: string;
  typeCode: "phone" | "home";
}

export interface LegacyGroup {
  id: string;
  name: string;
  grade: string;
  active: boolean;
  order: number;
  mainServant: string;
  assistantServants: string[];
  servantContact: string;
}

export interface LegacyMember {
  id: string;
  name: string;
  givenName: string;
  fatherName: string;
  groupId: string;
  active: boolean;
  joinedAt: string;
  phone: string;
  familyPhone: string;
  additionalFamilyPhone: string;
  address: string;
  school: string;
  birthDate: string;
  brotherOfLord: boolean;
  activities: string[];
  notes: string;
  archivedAt: string | null;
}

export interface MemberRecord {
  memberId: string;
  [fieldKey: string]: boolean | string;
}

export interface SubmissionRecord {
  id: string;
  date: string;
  dateISO: string;
  records: MemberRecord[];
  submittedBy?: string;
  groupIds?: string[];
}

export interface ActivityItem {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface DashboardUser {
  id: string;
  name: string;
  role: "admin" | "servant" | string;
  assignedGroups: string[];
  permissions?: string[];
}

export interface MemberNoteItem {
  id: string;
  memberId: string;
  title: string;
  content: string;
  category: string;
  isImportant: boolean;
  createdAt: string;
  createdBy: string | null;
}

export interface BackupSnapshot {
  ts: string;
  groups: any[];
  members: any[];
  subs: any[];
  [key: string]: any;
}
