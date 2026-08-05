"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { NotificationProvider } from "@/features/notifications/context/notification-provider";
import {
  getVisibleNavigationItems,
  getNavigationGroups,
  isRouteActive,
  findActiveNavigationItem,
  getBreadcrumbs,
  type NavPermissionContext,
  type NavigationItem,
} from "@/features/app-shell/config/navigation-config";

export function AppShell({
  userId,
  userName,
  canManageServantFollowUp,
  canViewVisitation,
  canViewAllNotifications,
  children,
}: {
  userId: string;
  userName: string;
  canManageServantFollowUp: boolean;
  canViewVisitation: boolean;
  canViewAllNotifications: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isFocusedMode, setIsFocusedMode] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const permissionCtx: NavPermissionContext = {
    canManageServantFollowUp,
    canViewVisitation,
    canViewAllNotifications,
  };

  const visibleItems = getVisibleNavigationItems(permissionCtx);
  const groups = getNavigationGroups(permissionCtx);
  const activeItem = findActiveNavigationItem(pathname);
  const breadcrumbs = getBreadcrumbs(pathname);

  const logout = async () => {
    setSigningOut(true);
    try {
      await fetch("/api/auth/sign-out", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  };

  const handleNavItemClick = (item: NavigationItem) => {
    setMobileOpen(false);
    if (isRouteActive(item.route, pathname)) {
      setIsFocusedMode((prev) => !prev);
    } else {
      setIsFocusedMode(false);
    }
  };

  return (
    <NotificationProvider userId={userId} canViewAll={canViewAllNotifications}>
      <div className="dashboard-frame">
        {/* Glassmorphism Top Navigation Bar */}
        <header className="glass-topbar" role="banner">
          <div className="topbar-container">
            {/* Right Brand Section (RTL Start) */}
            <div className="topbar-brand">
              <Link href="/dashboard" className="brand-logo" aria-label="الرئيسية - خدمة مارمينا">
                <span className="brand-icon material-symbols-outlined" aria-hidden="true">
                  church
                </span>
                <div className="brand-text">
                  <strong>خدمة مارمينا</strong>
                  <small>إدارة الخدمة</small>
                </div>
              </Link>
            </div>

            {/* Centered Navigation Section */}
            <nav
              className={`topbar-nav ${isFocusedMode ? "is-focused" : "is-expanded"}`}
              aria-label="التنقل الرئيسي"
            >
              {isFocusedMode && activeItem ? (
                <button
                  type="button"
                  className="nav-focused-pill active"
                  onClick={() => setIsFocusedMode(false)}
                  aria-expanded={false}
                  aria-label={`${activeItem.label} - انقر لإظهار كافة القوائم`}
                  title="انقر لإظهار كافة القوائم"
                >
                  <div className="nav-pill-content">
                    <span className="material-symbols-outlined nav-icon" aria-hidden="true">
                      {activeItem.icon}
                    </span>
                    <span className="nav-label">{activeItem.label}</span>
                  </div>
                  <span className="nav-group-tag">{activeItem.groupLabel}</span>
                  <span className="material-symbols-outlined expand-hint" aria-hidden="true">
                    unfold_more
                  </span>
                </button>
              ) : (
                <div className="nav-pills-wrapper">
                  {visibleItems.map((item) => {
                    const active = isRouteActive(item.route, pathname);
                    return (
                      <Link
                        key={item.id}
                        href={item.route}
                        className={`nav-pill ${active ? "active" : ""}`}
                        onClick={() => handleNavItemClick(item)}
                        aria-current={active ? "page" : undefined}
                        title={`${item.label} (${item.groupLabel})`}
                      >
                        <span className="material-symbols-outlined nav-icon" aria-hidden="true">
                          {item.icon}
                        </span>
                        <span className="nav-label">{item.label}</span>
                        {active && <span className="active-glow-indicator" />}
                      </Link>
                    );
                  })}
                </div>
              )}
            </nav>

            {/* Left Actions Section (RTL End) */}
            <div className="topbar-actions">
              <NotificationBell userId={userId} canViewAll={canViewAllNotifications} />

              <Link href="/dashboard/me" className="topbar-avatar" title={userName} aria-label="الملف الشخصي">
                {userName.slice(0, 1) || "م"}
              </Link>

              <button
                className="topbar-logout"
                onClick={() => void logout()}
                disabled={signingOut}
                aria-label="تسجيل الخروج"
                title="تسجيل الخروج"
              >
                <span className="material-symbols-outlined logout-icon" aria-hidden="true">
                  logout
                </span>
                <span className="logout-text">{signingOut ? "جارٍ الخروج…" : "خروج"}</span>
              </button>

              {/* Mobile Menu Toggle */}
              <button
                className="mobile-menu-toggle"
                aria-label={mobileOpen ? "إغلاق القائمة" : "فتح القائمة"}
                aria-expanded={mobileOpen}
                onClick={() => setMobileOpen(!mobileOpen)}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  {mobileOpen ? "close" : "menu"}
                </span>
              </button>
            </div>
          </div>

          {/* Dynamic Breadcrumbs Sub-bar */}
          <div className="topbar-breadcrumbs" aria-label="مسار التنقل">
            <div className="breadcrumbs-container">
              {breadcrumbs.map((crumb, idx) => (
                <span key={idx} className="breadcrumb-item">
                  {idx > 0 && (
                    <span className="breadcrumb-separator material-symbols-outlined" aria-hidden="true">
                      chevron_left
                    </span>
                  )}
                  {crumb.route ? (
                    <Link href={crumb.route} className="breadcrumb-link">
                      {crumb.icon && (
                        <span className="breadcrumb-icon material-symbols-outlined" aria-hidden="true">
                          {crumb.icon}
                        </span>
                      )}
                      <span>{crumb.label}</span>
                    </Link>
                  ) : (
                    <span className="breadcrumb-current">
                      {crumb.icon && (
                        <span className="breadcrumb-icon material-symbols-outlined" aria-hidden="true">
                          {crumb.icon}
                        </span>
                      )}
                      <span>{crumb.label}</span>
                    </span>
                  )}
                </span>
              ))}
            </div>
          </div>
        </header>

        {/* Mobile Glassmorphism Drawer Overlay */}
        {mobileOpen && (
          <div className="mobile-drawer-backdrop" onClick={() => setMobileOpen(false)}>
            <div
              className="mobile-drawer-content"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-label="قائمة التنقل للهواتف"
            >
              <div className="mobile-drawer-header">
                <div className="drawer-user">
                  <span className="drawer-avatar">{userName.slice(0, 1) || "م"}</span>
                  <div>
                    <strong>{userName}</strong>
                    <small>حساب نشط</small>
                  </div>
                </div>
                <button
                  className="drawer-close-button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="إغلاق"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <nav className="mobile-drawer-nav">
                {groups.map((group) => (
                  <div key={group.id} className="mobile-nav-group">
                    <h3 className="mobile-group-title">{group.label}</h3>
                    <div className="mobile-group-items">
                      {group.items.map((item) => {
                        const active = isRouteActive(item.route, pathname);
                        return (
                          <Link
                            key={item.id}
                            href={item.route}
                            className={`mobile-nav-item ${active ? "active" : ""}`}
                            onClick={() => handleNavItemClick(item)}
                          >
                            <span className="material-symbols-outlined" aria-hidden="true">
                              {item.icon}
                            </span>
                            <span>{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </nav>

              <div className="mobile-drawer-footer">
                <button
                  className="mobile-logout-button"
                  onClick={() => void logout()}
                  disabled={signingOut}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    logout
                  </span>
                  <span>{signingOut ? "جارٍ الخروج…" : "تسجيل الخروج"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Workspace Frame */}
        <div className="dashboard-workspace">
          <main className="dashboard-content">{children}</main>
        </div>
      </div>
    </NotificationProvider>
  );
}
