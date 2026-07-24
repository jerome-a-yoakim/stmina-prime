import { AuditLog } from "../types/auth";
import { authStorageProvider } from "./storage-provider";

export const auditLogService = {
  getLogs(): AuditLog[] {
    return authStorageProvider.getAuditLogs();
  },

  logAction(payload: {
    action: AuditLog["action"];
    performedBy: string;
    targetUser?: string;
    details: string;
  }): void {
    const logs = this.getLogs();
    const newLog: AuditLog = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      action: payload.action,
      performedBy: payload.performedBy,
      targetUser: payload.targetUser,
      details: payload.details
    };
    logs.unshift(newLog);
    // Keep last 200 audit logs
    authStorageProvider.saveAuditLogs(logs.slice(0, 200));
  }
};
