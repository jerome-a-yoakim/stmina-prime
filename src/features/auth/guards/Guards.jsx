import React from "react";
import { hasPermission } from "../permissions/permission-checker";
import { AccessDeniedPage } from "../components/AccessDeniedPage";

export function AuthGuard({ currentUser, fallback, children }) {
  if (!currentUser || !currentUser.enabled) {
    return fallback || <AccessDeniedPage />;
  }
  return <>{children}</>;
}

export function PermissionGuard({ currentUser, permission, fallback, children }) {
  if (!hasPermission(currentUser, permission)) {
    return fallback || null;
  }
  return <>{children}</>;
}

export function RoleGuard({ currentUser, allowedRoles, fallback, children }) {
  if (!currentUser || !allowedRoles.includes(currentUser.role)) {
    return fallback || null;
  }
  return <>{children}</>;
}
