export type PermissionCategory =
  | "Members"
  | "Profiles"
  | "Attendance"
  | "Statistics"
  | "Reports"
  | "Administration"
  | "Settings";

export type Permission =
  | "view_family_members"
  | "edit_family_members"
  | "view_member_profiles"
  | "edit_member_profiles"
  | "attendance_access"
  | "view_family_stats"
  | "reports_access"
  | "user_management"
  | "audit_logs"
  | "settings_access"
  | "view_notes"
  | "add_notes"
  | "edit_notes"
  | "delete_notes"
  | "export_member_report";

export type Role = "admin" | "family" | "servant" | "teacher" | "class_leader" | "secretary";

export interface UserAccount {
  id: number;
  username: string;
  password?: string;
  name: string;
  role: Role;
  assignedGroups: string[];
  permissions: Permission[];
  enabled: boolean;
  deleted?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface MemberNote {
  id: number;
  memberId: number;
  title: string;
  content: string;
  category: "General" | "Spiritual" | "Follow-up" | "Family" | "Health" | "Education" | "Other";
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface AuditLog {
  id: number;
  timestamp: string;
  action:
    | "User Created"
    | "User Updated"
    | "User Disabled"
    | "User Enabled"
    | "User Soft Deleted"
    | "Password Reset"
    | "Permission Changed"
    | "Family Assignment Changed"
    | "Login Successful"
    | "Logout";
  performedBy: string;
  targetUser?: string;
  details: string;
}

export interface IAuthStorageProvider {
  getUsers(): UserAccount[];
  saveUsers(users: UserAccount[]): void;
  getCurrentSession(): UserAccount | null;
  setCurrentSession(user: UserAccount | null): void;
  getAuditLogs(): AuditLog[];
  saveAuditLogs(logs: AuditLog[]): void;
}
