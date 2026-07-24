import { IAuthStorageProvider, UserAccount, AuditLog } from "../types/auth";
import { MOCK_DEFAULT_USERS } from "../mock/default-users";

const STORAGE_KEYS = {
  users: "church_users",
  session: "church_session",
  auditLogs: "church_audit_logs"
};

export class LocalStorageAuthProvider implements IAuthStorageProvider {
  getUsers(): UserAccount[] {
    if (typeof window === "undefined") return MOCK_DEFAULT_USERS;
    try {
      const val = localStorage.getItem(STORAGE_KEYS.users);
      return val ? JSON.parse(val) : MOCK_DEFAULT_USERS;
    } catch {
      return MOCK_DEFAULT_USERS;
    }
  }

  saveUsers(users: UserAccount[]): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
    } catch {}
  }

  getCurrentSession(): UserAccount | null {
    if (typeof window === "undefined") return null;
    try {
      const val = localStorage.getItem(STORAGE_KEYS.session);
      return val ? JSON.parse(val) : null;
    } catch {
      return null;
    }
  }

  setCurrentSession(user: UserAccount | null): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(user));
    } catch {}
  }

  getAuditLogs(): AuditLog[] {
    if (typeof window === "undefined") return [];
    try {
      const val = localStorage.getItem(STORAGE_KEYS.auditLogs);
      return val ? JSON.parse(val) : [];
    } catch {
      return [];
    }
  }

  saveAuditLogs(logs: AuditLog[]): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEYS.auditLogs, JSON.stringify(logs));
    } catch {}
  }
}

// Singleton storage provider instance
export const authStorageProvider: IAuthStorageProvider = new LocalStorageAuthProvider();
