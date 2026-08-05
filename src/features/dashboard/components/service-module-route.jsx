"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseUser } from "@/infrastructure/supabase/auth-bridge";
import { hasPermission, filterGroupsForUser, filterMembersForUser, filterSubmissionsForUser } from "@/features/auth/authorization/permission-checker";
import { listAllGroups } from "@/features/groups/data/group-service";
import { listAllMembers } from "@/features/members/data/member-service";
import { listActivities } from "@/features/activities/data/activity-service";
import { listSubmissions, saveSubmission, deleteSubmission } from "@/features/attendance/data/attendance-service";
import { AccessDeniedPage } from "@/features/auth/components/access-denied-page";
import { UserManagementPage } from "@/features/auth/components/user-management-page";
import { MemberHierarchy } from "@/features/members/components/member-hierarchy";
import { MemberProfilePage } from "@/features/members/components/member-profile-view";
import { DataEntryPage } from "@/features/attendance/components/data-entry-view";
import { ActivitiesPage } from "@/features/activities/components/activities-view";
import { HistoryPage } from "@/features/reports/components/history-view";
import { exportOverviewExcel } from "@/features/reports/utils/excel-exporter";
import { BackupsPage } from "@/features/backups/components/backups-view";
import { DashboardPage } from "@/features/dashboard/views/dashboard-analytics-view";
import { buildCSS } from "@/features/dashboard/styles/dashboard-theme";
import { toLegacyGroup, toLegacyMember } from "@/features/dashboard/utils/legacy-adapters";

async function listResponsibleServants() {
  const response = await fetch("/api/family-servants", { cache: "no-store" });
  if (!response.ok) throw new Error("تعذر تحميل تكليفات الخدام.");
  return response.json();
}

const permissionByModule = {
  home: "view_family_stats",
  attendance: "attendance_access",
  members: "view_family_members",
  groups: "view_family_members",
  activities: "view_family_members",
  reports: "reports_access",
  settings: "settings_access",
  users: "user_management",
};

/** @param {{ module: string, memberId?: string | null }} props */
export function ServiceModuleRoute({ module, memberId = null }) {
  const router = useRouter();
  const [state, setState] = useState({
    user: null, groups: [], members: [], submissions: [], activities: [], servantAssignments: [], loading: true, error: "",
  });

  const reload = useCallback(async () => {
    try {
      const [user, groups, members, submissions, activities, servantAssignments] = await Promise.all([
        getSupabaseUser(), listAllGroups(), listAllMembers(), listSubmissions(), listActivities(), listResponsibleServants(),
      ]);
      if (!user) throw new Error("تعذر تحميل حساب المستخدم النشط.");
      setState({ user, groups: groups.map(toLegacyGroup), members: members.map(toLegacyMember),
        submissions, activities, servantAssignments, loading: false, error: "" });
    } catch (error) {
      setState((current) => ({ ...current, loading: false,
        error: error instanceof Error ? error.message : "تعذر تحميل بيانات الخدمة." }));
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);
  if (state.loading) return <RouteState title="جارٍ تحميل بيانات الخدمة…" />;
  if (state.error || !state.user) return <RouteState title={state.error || "تعذر تحميل الحساب"} error />;

  const { user, groups, members, submissions, activities, servantAssignments } = state;
  const scopedGroups = filterGroupsForUser(user, groups);
  const scopedMembers = filterMembersForUser(user, members, groups);
  const scopedSubmissions = filterSubmissionsForUser(user, submissions, members, groups);
  const permission = permissionByModule[module];
  if (permission && !hasPermission(user, permission)) {
    return <AccessDeniedPage onGoHome={() => router.push("/home/dashboard")} />;
  }

  async function handleSave(submission, isEdit) {
    const saved = await saveSubmission({
      id: isEdit ? submission.id : undefined,
      dateISO: submission.dateISO,
      records: submission.records,
    }, user.id);
    await reload();
    return saved;
  }
  async function handleDelete(id) { await deleteSubmission(id); await reload(); }

  let content;
  if (memberId) {
    const member = scopedMembers.find((item) => String(item.id) === String(memberId));
    const family = member ? scopedGroups.find((item) => String(item.id) === String(member.groupId)) : null;
    content = member
      ? <><nav className="profile-hierarchy-breadcrumb" aria-label="مسار التنقل">
          <button type="button" onClick={() => router.push("/members")}>المخدومين والأسر</button><span>‹</span>
          {family && <><span>{family.grade || "بدون صف / فصل"}</span><span>‹</span><span>{family.name}</span><span>‹</span></>}
          <strong>{member.name}</strong>
        </nav><MemberProfilePage currentUser={user} member={member} groups={scopedGroups} members={scopedMembers}
          submissions={scopedSubmissions} activities={activities} onBack={() => router.push("/members")} onUpdate={reload}/>
        </>
      : <RouteState title="لم يتم العثور على المخدوم." error />;
  } else {
    switch (module) {
      case "home":
        content = <DashboardPage submissions={scopedSubmissions} groups={scopedGroups} members={scopedMembers}/>;
        break;
      case "attendance":
        content = <DataEntryPage currentUser={user} groups={scopedGroups} members={scopedMembers}
          submissions={scopedSubmissions} onSave={handleSave}/>;
        break;
      case "members":
      case "groups":
        content = <MemberHierarchy currentUser={user} groups={scopedGroups} members={scopedMembers}
          activities={activities} submissions={scopedSubmissions} servantAssignments={servantAssignments} onUpdate={reload}
          onViewProfile={(member) => router.push(`/member/${member.id}`)}/>;
        break;
      case "activities":
        content = <ActivitiesPage activities={activities} members={scopedMembers} onUpdate={reload}/>;
        break;
      case "reports":
        content = <HistoryPage submissions={scopedSubmissions} groups={scopedGroups} members={scopedMembers}
          onDelete={handleDelete} onExportOverview={() => exportOverviewExcel(scopedSubmissions, scopedGroups, scopedMembers)}/>;
        break;
      case "settings":
        content = <BackupsPage systemProfileId={user.id}/>;
        break;
      case "users":
        content = <UserManagementPage groups={groups} onUpdate={reload}/>;
        break;
      default:
        content = <RouteState title="المسار غير معروف." error />;
    }
  }
  return <div className="service-module"><style>{buildCSS(false)}{`.profile-hierarchy-breadcrumb{direction:rtl;display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin-bottom:14px;color:var(--muted);font-size:12px}.profile-hierarchy-breadcrumb button{border:0;background:none;color:var(--primary);font:inherit;cursor:pointer;padding:2px}.profile-hierarchy-breadcrumb strong{color:var(--text)}`}</style>{content}</div>;
}

function RouteState({ title, error = false }) {
  return <div className={`route-state ${error ? "error-state" : ""}`}><span>{error ? "!" : "…"}</span><p>{title}</p></div>;
}
