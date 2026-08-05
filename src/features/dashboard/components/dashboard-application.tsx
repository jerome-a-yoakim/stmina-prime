"use client";

import React, { useState, useEffect, useCallback } from "react";
import { getSupabaseUser, supabaseSignOut } from "@/infrastructure/supabase/auth-bridge";
import {
  hasPermission,
  filterGroupsForUser,
  filterMembersForUser,
  filterSubmissionsForUser,
} from "@/features/auth/authorization/permission-checker";
import { UserManagementPage } from "@/features/auth/components/user-management-page";
import { AccessDeniedPage } from "@/features/auth/components/access-denied-page";
import { TopbarAuth } from "@/features/auth/components/topbar-auth";

import { listAllGroups } from "@/features/groups/data/group-service";
import { listAllMembers } from "@/features/members/data/member-service";
import { listActivities } from "@/features/activities/data/activity-service";
import { listSubmissions, saveSubmission, deleteSubmission } from "@/features/attendance/data/attendance-service";

import { LegacyGroup, LegacyMember, SubmissionRecord, ActivityItem, DashboardUser } from "../types/dashboard-types";
import { toLegacyGroup, toLegacyMember } from "../utils/legacy-adapters";
import { exportOverviewExcel } from "@/features/reports/utils/excel-exporter";
import { buildCSS, APP_NAME, APP_SUBTITLE } from "../styles/dashboard-theme";
import { SK, readLocalPref, writeLocalPref } from "../utils/local-storage-prefs";
import { Alert } from "../ui/alert";

import { DataEntryPage } from "@/features/attendance/components/data-entry-view";
import { DashboardPage } from "../views/dashboard-analytics-view";
import { HistoryPage } from "@/features/reports/components/history-view";
import { ManagementPage } from "@/features/members/components/management-view";
import { ActivitiesPage } from "@/features/activities/components/activities-view";
import { BackupsPage } from "@/features/backups/components/backups-view";
import { MemberProfilePage } from "@/features/members/components/member-profile-view";

// Re-export all entities required by external callers
export {
  ActivitiesPage,
  BackupsPage,
  buildCSS,
  DashboardPage,
  DataEntryPage,
  exportOverviewExcel,
  HistoryPage,
  MemberProfilePage,
  toLegacyGroup,
  toLegacyMember,
};

const NAV = [
  { section: "مساحة المستخدم" },
  { id: "my-workspace", label: "لوحتي الشخصية", icon: "👤", href: "/dashboard/me" },
  { id: "announcements", label: "الإعلانات", icon: "📣", href: "/announcements" },
  { id: "new-users", label: "إدارة المستخدمين الجديدة", icon: "🔐", permission: "user_management", href: "/users" },
  { id: "servant-follow-up", label: "متابعة الخدام", icon: "📈", permission: "user_management", href: "/servant-followup" },
  { section: "الخدمة" },
  { id: "dashboard", label: "لوحة الإحصائيات", icon: "📊", permission: "view_family_stats", href: "/dashboard" },
  { id: "entry", label: "إدخال البيانات", icon: "✏️", permission: "attendance_access", href: "/attendance" },
  { id: "history", label: "سجل الأسابيع والتصدير", icon: "📋", permission: "reports_access", href: "/reports" },
  { section: "الإدارة" },
  { id: "members", label: "إدارة الأعضاء", icon: "👥", permission: "view_family_members", href: "/members" },
  { id: "activities", label: "الأنشطة", icon: "🎯", permission: "view_family_members", href: "/activities" },
  { id: "users", label: "إدارة الحسابات", icon: "🔐", permission: "user_management", href: "/users" },
  { id: "backups", label: "النسخ الاحتياطية", icon: "💾", permission: "settings_access", href: "/settings" },
];

const PAGE_TITLES: Record<string, string> = {
  entry: "إدخال البيانات الأسبوعية",
  dashboard: "لوحة الإحصائيات",
  history: "سجل الأسابيع والتصدير",
  members: "إدارة الأعضاء",
  activities: "إدارة الأنشطة",
  users: "إدارة الحسابات والصلاحيات",
  backups: "النسخ الاحتياطية",
  profile: "ملف العضو",
};

const LOGO_URL = "/mnt/user-data/uploads/Asset_1لوجو_اولاد.png";

export default function App() {
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [page, setPage] = useState<string>("dashboard");
  const [groups, setGroups] = useState<LegacyGroup[]>([]);
  const [members, setMembers] = useState<LegacyMember[]>([]);
  const [subs, setSubs] = useState<SubmissionRecord[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [systemProfileId, setSystemProfileId] = useState<string | null>(null);
  const [dark, setDark] = useState<boolean>(() => readLocalPref(SK.darkMode, false));
  const [profileMember, setProfileMember] = useState<LegacyMember | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState<boolean>(false);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const [freshGroups, freshMembers, freshSubs, freshActivities] = await Promise.all([
        listAllGroups(),
        listAllMembers(),
        listSubmissions(),
        listActivities(),
      ]);
      setGroups(freshGroups.map(toLegacyGroup));
      setMembers(freshMembers.map(toLegacyMember));
      setSubs(freshSubs as SubmissionRecord[]);
      setActivities(freshActivities as ActivityItem[]);
      setLoadError(null);
    } catch (e: any) {
      setLoadError(e.message || "تعذر تحميل البيانات من قاعدة البيانات");
    }
  }, []);

  useEffect(() => {
    (async () => {
      setInitialLoading(true);
      try {
        const bridgeUser = await getSupabaseUser();
        if (bridgeUser) {
          setUser(bridgeUser as DashboardUser);
          setSystemProfileId(bridgeUser.id);
          await reload();
        } else {
          setLoadError(
            "تعذر تحميل حساب المستخدم. تأكد أن الحساب موجود في جدول users وحالته active وله دور في user_roles، ثم سجّل الدخول مرة أخرى."
          );
        }
      } catch (e: any) {
        setLoadError(String(e instanceof Error ? e.message : e) || "تعذر تحميل جلسة المستخدم");
      } finally {
        setInitialLoading(false);
      }
    })();
  }, [reload]);

  useEffect(() => {
    writeLocalPref(SK.darkMode, dark);
  }, [dark]);

  const handleLogout = () => {
    supabaseSignOut().then(() => {
      setUser(null);
      window.location.href = "/login";
    });
  };

  const handleSave = async (sub: SubmissionRecord, isEdit: boolean) => {
    const saved = await saveSubmission(
      { id: isEdit ? sub.id : undefined, dateISO: sub.dateISO, records: sub.records as any },
      systemProfileId!
    );
    setSubs(prev => (isEdit ? prev.map(s => (s.id === saved.id ? (saved as SubmissionRecord) : s)) : [...prev, saved as SubmissionRecord]));
    return saved as SubmissionRecord;
  };

  const handleDelete = async (id: string) => {
    await deleteSubmission(id);
    setSubs(prev => prev.filter(s => s.id !== id));
  };

  const handleViewProfile = (member: LegacyMember) => {
    setProfileMember(member);
    setPage("profile");
    setMobileNavOpen(false);
  };
  const handleBackFromProfile = () => {
    setProfileMember(null);
    setPage("members");
  };

  const CSS = buildCSS(dark);

  if (initialLoading) {
    return (
      <>
        <style>{CSS}</style>
        <div className="app" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
          <div className="empty">
            <div className="ei">⏳</div>جارٍ تحميل بيانات النظام...
          </div>
        </div>
      </>
    );
  }

  if (loadError || !user) {
    return (
      <>
        <style>{CSS}</style>
        <div className="app" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
          <div style={{ maxWidth: 420, textAlign: "center" }}>
            <Alert type="error">⚠️ {loadError}</Alert>
            <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={handleLogout}>
              تسجيل الدخول مرة أخرى
            </button>
          </div>
        </div>
      </>
    );
  }

  const userAcc = user as any;
  const scopedGroups = filterGroupsForUser(userAcc, groups as any) as unknown as LegacyGroup[];
  const scopedMembers = filterMembersForUser(userAcc, members as any, groups as any) as unknown as LegacyMember[];
  const scopedSubs = filterSubmissionsForUser(userAcc, subs as any, members as any, groups as any) as unknown as SubmissionRecord[];
  const visibleNav = NAV.filter(n => !n.id || hasPermission(userAcc, (n as any).permission));
  const checkAccess = (perm: string) => hasPermission(userAcc, perm as any);

  const UserMgmtComp = UserManagementPage as any;

  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        <div className={`sb-overlay ${mobileNavOpen ? "open" : ""}`} onClick={() => setMobileNavOpen(false)} />

        <nav className={`sb ${mobileNavOpen ? "open" : ""}`}>
          <div className="sb-logo">
            <img src={LOGO_URL} alt="logo" className="sb-logo-img" onError={(e: any) => (e.target.style.display = "none")} />
            <h1>{APP_NAME}</h1>
            <p>{APP_SUBTITLE}</p>
          </div>
          <div className="sb-user">
            <div className="sb-avatar">{user.name ? user.name[0] : "👤"}</div>
            <div>
              <div className="sb-uname">{user.name}</div>
              <div className="sb-urole">{user.role === "admin" ? "🔴 مدير النظام" : "🟢 حساب الأسرة"}</div>
            </div>
          </div>
          <div className="sb-nav">
            {visibleNav.map((n, i) =>
              n.section ? (
                <div key={i} className="sb-section">
                  {n.section}
                </div>
              ) : (
                <div
                  key={n.id}
                  className={`nav-item ${page === n.id ? "active" : ""}`}
                  onClick={() => {
                    if (n.href) {
                      window.location.assign(n.href);
                      return;
                    }
                    setPage(n.id!);
                    setProfileMember(null);
                    setMobileNavOpen(false);
                  }}
                >
                  <span className="nav-icon">{n.icon}</span>
                  {n.label}
                </div>
              )
            )}
          </div>
          <div className="sb-footer">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div className="sb-stat">
                أسابيع: <b style={{ color: "#E73F1E" }}>{scopedSubs.length}</b>
              </div>
              <button className="dark-toggle" onClick={() => setDark(d => !d)}>
                {dark ? "☀️" : "🌙"}
              </button>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              style={{ color: "#D84315", borderColor: "#F2E8E4", fontSize: 11, width: "100%", justifyContent: "center", fontWeight: 800 }}
              onClick={handleLogout}
            >
              تسجيل الخروج
            </button>
          </div>
        </nav>

        <main className="main">
          <div className="topbar">
            <div style={{ display: "flex", alignItems: "center" }}>
              <button className="mobile-nav-toggle" onClick={() => setMobileNavOpen(o => !o)} title="القائمة">
                ☰
              </button>
              <h2>
                {PAGE_TITLES[page]}
                {profileMember && page === "profile" ? `: ${profileMember.name}` : ""}
              </h2>
            </div>
            <div className="topbar-right">
              <div className="date-chip">
                {new Date().toLocaleDateString("ar-EG", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </div>
              <TopbarAuth currentUser={user as any} onLoginClick={() => setUser(null)} onLogoutClick={handleLogout} />
            </div>
          </div>
          <div className="content">
            {page === "entry" &&
              (checkAccess("attendance_access") ? (
                <DataEntryPage currentUser={user} groups={scopedGroups} members={scopedMembers} submissions={scopedSubs} onSave={handleSave} />
              ) : (
                <AccessDeniedPage onGoHome={() => setPage("dashboard")} />
              ))}
            {page === "dashboard" &&
              (checkAccess("view_family_stats") ? (
                <DashboardPage submissions={scopedSubs} groups={scopedGroups} members={scopedMembers} />
              ) : (
                <AccessDeniedPage onGoHome={() => setPage("entry")} />
              ))}
            {page === "history" &&
              (checkAccess("reports_access") ? (
                <HistoryPage
                  submissions={scopedSubs}
                  groups={scopedGroups}
                  members={scopedMembers}
                  onDelete={handleDelete}
                  onExportOverview={() => exportOverviewExcel(scopedSubs, scopedGroups, scopedMembers)}
                />
              ) : (
                <AccessDeniedPage onGoHome={() => setPage("dashboard")} />
              ))}
            {page === "members" &&
              (checkAccess("view_family_members") ? (
                <ManagementPage
                  groups={scopedGroups}
                  members={scopedMembers}
                  activities={activities}
                  submissions={scopedSubs}
                  onUpdate={reload}
                  onViewProfile={handleViewProfile}
                />
              ) : (
                <AccessDeniedPage onGoHome={() => setPage("dashboard")} />
              ))}
            {page === "activities" &&
              (checkAccess("view_family_members") ? (
                <ActivitiesPage activities={activities} members={scopedMembers} onUpdate={reload} />
              ) : (
                <AccessDeniedPage onGoHome={() => setPage("dashboard")} />
              ))}
            {page === "users" &&
              (checkAccess("user_management") ? (
                <UserMgmtComp groups={groups} onUpdate={reload} />
              ) : (
                <AccessDeniedPage onGoHome={() => setPage("dashboard")} />
              ))}
            {page === "backups" &&
              (checkAccess("settings_access") ? (
                <BackupsPage systemProfileId={systemProfileId} />
              ) : (
                <AccessDeniedPage onGoHome={() => setPage("dashboard")} />
              ))}
            {page === "profile" &&
              profileMember &&
              (checkAccess("view_member_profiles") ? (
                <MemberProfilePage
                  currentUser={user}
                  member={profileMember}
                  groups={scopedGroups}
                  members={scopedMembers}
                  submissions={scopedSubs}
                  activities={activities}
                  onBack={handleBackFromProfile}
                  onUpdate={reload}
                />
              ) : (
                <AccessDeniedPage onGoHome={() => setPage("members")} />
              ))}
          </div>
        </main>
      </div>
    </>
  );
}
