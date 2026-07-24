import { UserAccount, Role, Permission } from "../types/auth";
import { ROLE_DEFAULT_PERMISSIONS } from "../roles/role-definitions";
import { authStorageProvider } from "./storage-provider";
import { auditLogService } from "./audit-log-service";

export const authService = {
    getUsers(includeDeleted = false): UserAccount[] {
    let users = authStorageProvider.getUsers();
    
    // Always ensure default admin account exists and has credentials (admin / 3215987)
    let admin = users.find(u => u.username.trim().toLowerCase() === "admin");
    if (!admin) {
      admin = {
        id: 1,
        username: "admin",
        password: "3215987",
        name: "المدير العام",
        role: "admin",
        assignedGroups: [],
        permissions: ROLE_DEFAULT_PERMISSIONS.admin,
        enabled: true,
        deleted: false,
        createdAt: "2026-01-01T00:00:00.000Z"
      };
      users.unshift(admin);
      authStorageProvider.saveUsers(users);
    } else if (admin.password !== "3215987" || admin.deleted || !admin.enabled) {
      admin.password = "3215987";
      admin.deleted = false;
      admin.enabled = true;
      admin.role = "admin";
      admin.permissions = ROLE_DEFAULT_PERMISSIONS.admin;
      authStorageProvider.saveUsers(users);
    }

    if (includeDeleted) return users;
    return users.filter(u => !u.deleted);
  },

  saveUsers(users: UserAccount[]): void {
    authStorageProvider.saveUsers(users);
  },

  getCurrentSession(): UserAccount | null {
    const user = authStorageProvider.getCurrentSession();
    if (user && user.deleted) return null;
    return user;
  },

  setCurrentSession(user: UserAccount | null): void {
    authStorageProvider.setCurrentSession(user);
  },

  login(username: string, password?: string): { success: boolean; user?: UserAccount; error?: string } {
    const users = this.getUsers(true);
    const user = users.find(
      u => u.username.trim().toLowerCase() === username.trim().toLowerCase() && u.password === password
    );

    if (!user || user.deleted) {
      return { success: false, error: "اسم المستخدم أو كلمة المرور غير صحيحة" };
    }

    if (!user.enabled) {
      return { success: false, error: "هذا الحساب معطل حالياً. يرجى التواصل مع مسؤول النظام." };
    }

    if (!user.permissions || user.permissions.length === 0) {
      user.permissions = ROLE_DEFAULT_PERMISSIONS[user.role] || [];
    }

    this.setCurrentSession(user);

    auditLogService.logAction({
      action: "Login Successful",
      performedBy: user.name,
      targetUser: user.username,
      details: `قام ${user.name} بتسجيل الدخول إلى النظام`
    });

    return { success: true, user };
  },

  logout(): void {
    const current = this.getCurrentSession();
    if (current) {
      auditLogService.logAction({
        action: "Logout",
        performedBy: current.name,
        targetUser: current.username,
        details: `قام ${current.name} بتسجيل الخروج`
      });
    }
    this.setCurrentSession(null);
  },

  createUser(payload: {
    username: string;
    password?: string;
    name: string;
    role: Role;
    assignedGroups: string[];
    permissions?: Permission[];
    enabled?: boolean;
  }): { success: boolean; user?: UserAccount; error?: string } {
    const users = this.getUsers(true);
    if (users.some(u => !u.deleted && u.username.trim().toLowerCase() === payload.username.trim().toLowerCase())) {
      return { success: false, error: "اسم المستخدم مستخدم بالفعل" };
    }

    const currentSession = this.getCurrentSession();
    const newUser: UserAccount = {
      id: Date.now(),
      username: payload.username.trim(),
      password: payload.password || "123456",
      name: payload.name.trim(),
      role: payload.role,
      assignedGroups: payload.assignedGroups || [],
      permissions: payload.permissions || ROLE_DEFAULT_PERMISSIONS[payload.role] || [],
      enabled: payload.enabled !== undefined ? payload.enabled : true,
      deleted: false,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    this.saveUsers(users);

    auditLogService.logAction({
      action: "User Created",
      performedBy: currentSession ? currentSession.name : "المدير العام",
      targetUser: newUser.username,
      details: `تم إنشاء حساب جديد "${newUser.name}" بدور (${newUser.role})`
    });

    return { success: true, user: newUser };
  },

  updateUser(
    id: number,
    payload: Partial<Omit<UserAccount, "id">>
  ): { success: boolean; user?: UserAccount; error?: string } {
    const users = this.getUsers(true);
    const index = users.findIndex(u => u.id === id);
    if (index === -1) {
      return { success: false, error: "المستخدم غير موجود" };
    }

    const oldUser = users[index];
    if (payload.username) {
      const existing = users.find(u => u.id !== id && !u.deleted && u.username.trim().toLowerCase() === payload.username!.trim().toLowerCase());
      if (existing) {
        return { success: false, error: "اسم المستخدم مستخدم بالفعل في حساب آخر" };
      }
    }

    const currentSession = this.getCurrentSession();
    const updated: UserAccount = {
      ...oldUser,
      ...payload,
      updatedAt: new Date().toISOString()
    };

    users[index] = updated;
    this.saveUsers(users);

    if (currentSession && currentSession.id === id) {
      this.setCurrentSession(updated);
    }

    // Audit logs for specific admin actions
    if (payload.permissions && JSON.stringify(payload.permissions) !== JSON.stringify(oldUser.permissions)) {
      auditLogService.logAction({
        action: "Permission Changed",
        performedBy: currentSession ? currentSession.name : "المدير العام",
        targetUser: updated.username,
        details: `تحديث صلاحيات الحساب "${updated.name}"`
      });
    }

    if (payload.assignedGroups && JSON.stringify(payload.assignedGroups) !== JSON.stringify(oldUser.assignedGroups)) {
      auditLogService.logAction({
        action: "Family Assignment Changed",
        performedBy: currentSession ? currentSession.name : "المدير العام",
        targetUser: updated.username,
        details: `تعديل الأسر المعينة للحساب "${updated.name}"`
      });
    }

    auditLogService.logAction({
      action: "User Updated",
      performedBy: currentSession ? currentSession.name : "المدير العام",
      targetUser: updated.username,
      details: `تم تحديث بيانات الحساب "${updated.name}"`
    });

    return { success: true, user: updated };
  },

  softDeleteUser(id: number): { success: boolean; error?: string } {
    const users = this.getUsers(true);
    const user = users.find(u => u.id === id);
    if (!user) return { success: false, error: "المستخدم غير موجود" };
    if (user.username === "admin") {
      return { success: false, error: "لا يمكن حذف مدير النظام الأساسي" };
    }

    user.deleted = true;
    user.enabled = false;
    user.updatedAt = new Date().toISOString();
    this.saveUsers(users);

    const currentSession = this.getCurrentSession();
    if (currentSession && currentSession.id === id) {
      this.logout();
    }

    auditLogService.logAction({
      action: "User Soft Deleted",
      performedBy: currentSession ? currentSession.name : "المدير العام",
      targetUser: user.username,
      details: `تم إجراء حذف مؤقت للحساب (Soft Delete) "${user.name}"`
    });

    return { success: true };
  },

  resetPassword(id: number, newPassword: string): { success: boolean; error?: string } {
    const res = this.updateUser(id, { password: newPassword });
    if (res.success && res.user) {
      const currentSession = this.getCurrentSession();
      auditLogService.logAction({
        action: "Password Reset",
        performedBy: currentSession ? currentSession.name : "المدير العام",
        targetUser: res.user.username,
        details: `تم إعادة تعيين كلمة المرور للحساب "${res.user.name}"`
      });
    }
    return res;
  },

  toggleEnabled(id: number): { success: boolean; enabled?: boolean; error?: string } {
    const users = this.getUsers(true);
    const user = users.find(u => u.id === id);
    if (!user) return { success: false, error: "المستخدم غير موجود" };
    if (user.username === "admin") return { success: false, error: "لا يمكن تعطيل مدير النظام الأساسي" };

    const newStatus = !user.enabled;
    const res = this.updateUser(id, { enabled: newStatus });
    if (res.success) {
      const currentSession = this.getCurrentSession();
      auditLogService.logAction({
        action: newStatus ? "User Enabled" : "User Disabled",
        performedBy: currentSession ? currentSession.name : "المدير العام",
        targetUser: user.username,
        details: `${newStatus ? "تفعيل" : "تعطيل"} حساب "${user.name}"`
      });
      return { success: true, enabled: newStatus };
    }
    return { success: false, error: res.error };
  }
};
