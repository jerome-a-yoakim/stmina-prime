import React, { useState } from "react";
import { createGroup, setGroupActive, updateGroup } from "@/features/groups/data/group-service";
import {
  archiveMember,
  createMember,
  deleteMemberPermanently,
  restoreMember,
  updateMember,
} from "@/features/members/data/member-service";
import { GroupFormData, GroupFormModal } from "@/features/groups/components/group-form-modal";
import { MemberFormModal } from "./member-form-modal";
import {
  ActivityItem,
  DashboardUser,
  LegacyGroup,
  LegacyMember,
  SubmissionRecord,
} from "@/features/dashboard/types/dashboard-types";
import { Alert } from "@/features/dashboard/ui/alert";
import { Confirm } from "@/features/dashboard/ui/confirm-dialog";
import { readLocalPref } from "@/features/dashboard/utils/local-storage-prefs";

interface ManagementPageProps {
  currentUser?: DashboardUser;
  groups: LegacyGroup[];
  members: LegacyMember[];
  activities: ActivityItem[];
  submissions: SubmissionRecord[];
  onUpdate: () => Promise<void>;
  onViewProfile: (member: LegacyMember) => void;
  initialTab?: "members" | "groups" | "archived";
}

export function ManagementPage({
  currentUser,
  groups,
  members,
  activities,
  submissions,
  onUpdate,
  onViewProfile,
  initialTab = "members",
}: ManagementPageProps) {
  const [tab, setTab] = useState<string>(initialTab);
  const [flash, setFlash] = useState<{ type: string; msg: string } | null>(null);
  const [confirm, setConfirm] = useState<{ msg: string; onYes: () => void } | null>(null);
  const showFlash = (type: string, msg: string) => {
    setFlash({ type, msg });
    setTimeout(() => setFlash(null), 3000);
  };

  // MEMBERS
  const [memberModal, setMemberModal] = useState<{ mode: "add" | "edit"; member?: LegacyMember } | null>(null);
  const [mName, setMName] = useState<string>("");
  const [mGroup, setMGroup] = useState<string>(groups[0]?.id || "");
  const [searchM, setSearchM] = useState<string>("");
  const [filterG, setFilterG] = useState<string>("all");
  const [memberSaving, setMemberSaving] = useState<boolean>(false);

  const openAddMember = () => {
    setMName("");
    setMGroup(groups.filter(g => g.active)[0]?.id || "");
    setMemberModal({ mode: "add" });
  };
  const openEditMember = (m: LegacyMember) => {
    setMName(m.name);
    setMGroup(m.groupId);
    setMemberModal({ mode: "edit", member: m });
  };

  const saveMember = async () => {
    if (!mName.trim()) return showFlash("error", "الاسم مطلوب");
    setMemberSaving(true);
    try {
      if (memberModal?.mode === "add") {
        await createMember({ groupId: mGroup, fullName: mName.trim() });
        showFlash("success", "✅ تم إضافة العضو");
      } else if (memberModal?.member) {
        await updateMember(memberModal.member.id, { fullName: mName.trim(), groupId: mGroup });
        showFlash("success", "✅ تم تحديث بيانات العضو");
      }
      await onUpdate();
      setMemberModal(null);
    } catch (e: any) {
      showFlash("error", `فشل حفظ العضو: ${e.message || "خطأ غير متوقع"}`);
    } finally {
      setMemberSaving(false);
    }
  };

  const handleArchiveMember = async (m: LegacyMember) => {
    try {
      await archiveMember(m.id);
      await onUpdate();
      showFlash("success", "📦 تم أرشفة العضو");
    } catch (e: any) {
      showFlash("error", `فشل أرشفة العضو: ${e.message || "خطأ غير متوقع"}`);
    } finally {
      setConfirm(null);
    }
  };

  const handleRestoreMember = async (m: LegacyMember) => {
    try {
      await restoreMember(m.id);
      await onUpdate();
      showFlash("success", "✅ تم استعادة العضو");
    } catch (e: any) {
      showFlash("error", `فشل استعادة العضو: ${e.message || "خطأ غير متوقع"}`);
    }
  };

  const deleteMemberPerm = async (m: LegacyMember) => {
    try {
      await deleteMemberPermanently(m.id);
      await onUpdate();
      showFlash("success", "🗑 تم حذف العضو نهائياً");
    } catch (e: any) {
      showFlash("error", `فشل حذف العضو: ${e.message || "خطأ غير متوقع"}`);
    } finally {
      setConfirm(null);
    }
  };

  const [sortOption] = useState<string>(() => readLocalPref("church_member_sort", "name_asc"));

  const getMemberAttendancePct = (mId: string) => {
    const memberSubs = submissions.filter(s => (s.records || []).some(r => r.memberId === mId));
    if (!memberSubs.length) return 0;
    const presentCount = memberSubs.filter(s => {
      const rec = (s.records || []).find(r => r.memberId === mId);
      return rec && rec["حضور الخدمة"];
    }).length;
    return Math.round((presentCount / memberSubs.length) * 100);
  };

  const getMemberLastAttendanceDate = (mId: string) => {
    const memberAttendedSubs = submissions
      .filter(s => {
        const rec = (s.records || []).find(r => r.memberId === mId);
        return rec && rec["حضور الخدمة"];
      })
      .sort((a, b) => b.dateISO.localeCompare(a.dateISO));
    return memberAttendedSubs[0] ? memberAttendedSubs[0].dateISO : "1970-01-01";
  };

  const filteredMembers = members
    .filter(m => {
      const nameOk = !searchM || m.name.includes(searchM);
      const gOk =
        filterG === "all" ||
        (filterG === "archived" ? !m.active : String(m.groupId) === String(filterG) && m.active);
      return nameOk && gOk;
    })
    .sort((a, b) => {
      if (sortOption === "name_asc") return a.name.localeCompare(b.name, "ar");
      if (sortOption === "name_desc") return b.name.localeCompare(a.name, "ar");
      if (sortOption === "attend_desc")
        return getMemberAttendancePct(b.id) - getMemberAttendancePct(a.id);
      if (sortOption === "attend_asc")
        return getMemberAttendancePct(a.id) - getMemberAttendancePct(b.id);
      if (sortOption === "recent_attend")
        return getMemberLastAttendanceDate(b.id).localeCompare(getMemberLastAttendanceDate(a.id));
      if (sortOption === "oldest_attend")
        return getMemberLastAttendanceDate(a.id).localeCompare(getMemberLastAttendanceDate(b.id));
      if (sortOption === "date_desc") return (b.joinedAt || "").localeCompare(a.joinedAt || "");
      if (sortOption === "date_asc") return (a.joinedAt || "").localeCompare(b.joinedAt || "");
      return 0;
    });

  // GROUPS
  const [groupModal, setGroupModal] = useState<{ mode: "add" | "edit"; group?: LegacyGroup } | null>(null);
  const [gForm, setGForm] = useState<GroupFormData>({
    name: "",
    mainServant: "",
    assistantServants: [],
    servantContact: "",
  });
  const [groupSaving, setGroupSaving] = useState<boolean>(false);

  const saveGroup = async () => {
    if (!gForm.name.trim()) return showFlash("error", "اسم الأسرة مطلوب");
    setGroupSaving(true);
    try {
      if (groupModal?.mode === "add") {
        await createGroup({
          name: gForm.name.trim(),
          mainServant: gForm.mainServant,
          assistantServants: gForm.assistantServants,
          servantContact: gForm.servantContact,
        });
        showFlash("success", "✅ تم إضافة الأسرة");
      } else if (groupModal?.group) {
        await updateGroup(groupModal.group.id, {
          name: gForm.name.trim(),
          mainServant: gForm.mainServant,
          assistantServants: gForm.assistantServants,
          servantContact: gForm.servantContact,
        });
        showFlash("success", "✅ تم تحديث الأسرة");
      }
      await onUpdate();
      setGroupModal(null);
    } catch (e: any) {
      showFlash("error", `فشل حفظ الأسرة: ${e.message || "خطأ غير متوقع"}`);
    } finally {
      setGroupSaving(false);
    }
  };

  const handleArchiveGroup = async (g: LegacyGroup) => {
    try {
      await setGroupActive(g.id, false);
      await onUpdate();
      showFlash("success", "📦 تم أرشفة الأسرة");
    } catch (e: any) {
      showFlash("error", `فشل أرشفة الأسرة: ${e.message || "خطأ غير متوقع"}`);
    } finally {
      setConfirm(null);
    }
  };

  const handleRestoreGroup = async (g: LegacyGroup) => {
    try {
      await setGroupActive(g.id, true);
      await onUpdate();
      showFlash("success", "✅ تم استعادة الأسرة");
    } catch (e: any) {
      showFlash("error", `فشل استعادة الأسرة: ${e.message || "خطأ غير متوقع"}`);
    }
  };

  return (
    <div>
      {flash && <Alert type={flash.type}>{flash.msg}</Alert>}
      <div className="tabs">
        {(initialTab === "groups"
          ? [["groups", "🏠 الأسر"]]
          : [
              ["members", "👥 الأعضاء"],
              ["archived", "📦 الأرشيف"],
            ]
        ).map(([k, l]) => (
          <button
            key={k}
            className={`tab ${tab === k ? "active" : ""}`}
            onClick={() => setTab(k)}
          >
            {l}
          </button>
        ))}
      </div>

      {/* MEMBERS */}
      {tab === "members" && (
        <div>
          <div className="card">
            <div className="card-header">
              <h3>إدارة الأعضاء</h3>
              <button className="btn btn-primary btn-sm" onClick={openAddMember}>
                + إضافة عضو
              </button>
            </div>
            <div className="card-body">
              <div className="row" style={{ marginBottom: 12 }}>
                <input
                  className="inp inp-sm"
                  placeholder="بحث بالاسم..."
                  style={{ maxWidth: 200 }}
                  value={searchM}
                  onChange={e => setSearchM(e.target.value)}
                />
                <select
                  className="inp inp-sm"
                  style={{ maxWidth: 220 }}
                  value={filterG}
                  onChange={e => setFilterG(e.target.value)}
                >
                  <option value="all">جميع الأسر (النشطة)</option>
                  {groups
                    .filter(g => g.active)
                    .map(g => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  <option value="archived">المؤرشفون</option>
                </select>
                <span className="badge badge-indigo">{filteredMembers.length} عضو</span>
              </div>
              <div className="scroll-x">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>الاسم</th>
                      <th>الأسرة</th>
                      <th>الحالة</th>
                      <th>أخ الرب</th>
                      <th>تاريخ الانضمام</th>
                      <th>إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.map((m, i) => {
                      const g = groups.find(x => x.id === m.groupId);
                      return (
                        <tr key={m.id} className={!m.active ? "archived-row" : ""}>
                          <td style={{ color: "var(--muted)", fontSize: 12 }}>{i + 1}</td>
                          <td>
                            <button
                              className="btn btn-ghost btn-xs"
                              onClick={() => onViewProfile(m)}
                              style={{ fontWeight: 700 }}
                            >
                              {m.name}
                            </button>
                          </td>
                          <td>
                            <span className="badge badge-indigo" style={{ fontSize: 10 }}>
                              {g?.name || "—"}
                            </span>
                          </td>
                          <td>
                            {m.active ? (
                              <span className="badge badge-green">نشط</span>
                            ) : (
                              <span className="badge badge-gray">مؤرشف</span>
                            )}
                          </td>
                          <td>
                            {m.brotherOfLord ? (
                              <span className="badge badge-amber">✝️ نعم</span>
                            ) : (
                              <span className="badge badge-gray">لا</span>
                            )}
                          </td>
                          <td style={{ fontSize: 12, color: "var(--muted)" }}>
                            {m.joinedAt
                              ? new Date(m.joinedAt).toLocaleDateString("ar-EG")
                              : "—"}
                          </td>
                          <td>
                            <div className="row">
                              <button
                                className="btn btn-ghost btn-xs"
                                onClick={() => onViewProfile(m)}
                              >
                                👁 ملف
                              </button>
                              {m.active && (
                                <>
                                  <button
                                    className="btn btn-ghost btn-xs"
                                    onClick={() => openEditMember(m)}
                                  >
                                    ✏️
                                  </button>
                                  <button
                                    className="btn btn-xs"
                                    style={{
                                      background: "#fef3c7",
                                      color: "#92400e",
                                      border: "none",
                                    }}
                                    onClick={() =>
                                      setConfirm({
                                        msg: `أرشفة "${m.name}"؟`,
                                        onYes: () => handleArchiveMember(m),
                                      })
                                    }
                                  >
                                    📦
                                  </button>
                                </>
                              )}
                              {!m.active && (
                                <>
                                  <button
                                    className="btn btn-xs"
                                    style={{
                                      background: "#d1fae5",
                                      color: "#065f46",
                                      border: "none",
                                    }}
                                    onClick={() => handleRestoreMember(m)}
                                  >
                                    ↩
                                  </button>
                                  <button
                                    className="btn btn-xs"
                                    style={{
                                      background: "#fee2e2",
                                      color: "#991b1b",
                                      border: "none",
                                    }}
                                    onClick={() =>
                                      setConfirm({
                                        msg: `حذف "${m.name}" نهائياً؟`,
                                        onYes: () => deleteMemberPerm(m),
                                      })
                                    }
                                  >
                                    🗑
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {!filteredMembers.length && (
                      <tr>
                        <td colSpan={7}>
                          <div className="empty">
                            <div className="ei">🔍</div>لا توجد نتائج
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          {memberModal && (
            <MemberFormModal
              mode={memberModal.mode}
              name={mName}
              groupId={mGroup}
              groups={groups}
              saving={memberSaving}
              onNameChange={setMName}
              onGroupChange={setMGroup}
              onSave={saveMember}
              onClose={() => setMemberModal(null)}
            />
          )}
        </div>
      )}

      {/* GROUPS */}
      {tab === "groups" && (
        <div>
          <div className="card">
            <div className="card-header">
              <h3>إدارة الأسر</h3>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setGForm({
                    name: "",
                    mainServant: "",
                    assistantServants: [],
                    servantContact: "",
                  });
                  setGroupModal({ mode: "add" });
                }}
              >
                + إضافة أسرة
              </button>
            </div>
            <div className="card-body">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>اسم الأسرة</th>
                    <th>الخادم الرئيسي</th>
                    <th>الأعضاء</th>
                    <th>الحالة</th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((g, i) => {
                    const cnt = members.filter(m => m.groupId === g.id && m.active).length;
                    return (
                      <tr key={g.id} className={!g.active ? "archived-row" : ""}>
                        <td style={{ color: "var(--muted)", fontSize: 12 }}>{i + 1}</td>
                        <td style={{ fontWeight: 700 }}>{g.name}</td>
                        <td style={{ fontSize: 12 }}>{g.mainServant || "—"}</td>
                        <td>
                          <span className="badge badge-blue">{cnt}</span>
                        </td>
                        <td>
                          {g.active ? (
                            <span className="badge badge-green">نشطة</span>
                          ) : (
                            <span className="badge badge-gray">مؤرشفة</span>
                          )}
                        </td>
                        <td>
                          <div className="row">
                            {g.active && (
                              <>
                                <button
                                  className="btn btn-ghost btn-xs"
                                  onClick={() => {
                                    setGForm({
                                      name: g.name,
                                      mainServant: g.mainServant || "",
                                      assistantServants: g.assistantServants || [],
                                      servantContact: g.servantContact || "",
                                    });
                                    setGroupModal({ mode: "edit", group: g });
                                  }}
                                >
                                  ✏️
                                </button>
                                <button
                                  className="btn btn-xs"
                                  style={{
                                    background: "#fef3c7",
                                    color: "#92400e",
                                    border: "none",
                                  }}
                                  onClick={() =>
                                    setConfirm({
                                      msg: `أرشفة أسرة "${g.name}"؟`,
                                      onYes: () => handleArchiveGroup(g),
                                    })
                                  }
                                >
                                  📦
                                </button>
                              </>
                            )}
                            {!g.active && (
                              <button
                                className="btn btn-xs"
                                style={{
                                  background: "#d1fae5",
                                  color: "#065f46",
                                  border: "none",
                                }}
                                onClick={() => handleRestoreGroup(g)}
                              >
                                ↩
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          {groupModal && (
            <GroupFormModal
              mode={groupModal.mode}
              form={gForm}
              saving={groupSaving}
              onChange={setGForm}
              onSave={saveGroup}
              onClose={() => setGroupModal(null)}
            />
          )}
        </div>
      )}

      {/* ARCHIVE */}
      {tab === "archived" && (
        <div className="card">
          <div className="card-header">
            <h3>📦 الأرشيف</h3>
            <span className="badge badge-amber">{members.filter(m => !m.active).length}</span>
          </div>
          <div className="card-body">
            {!members.filter(m => !m.active).length ? (
              <div className="empty">
                <div className="ei">📭</div>الأرشيف فارغ
              </div>
            ) : (
              <table className="tbl">
                <thead>
                  <tr>
                    <th>الاسم</th>
                    <th>الأسرة</th>
                    <th>تاريخ الأرشفة</th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {members.filter(m => !m.active).map(m => {
                    const g = groups.find(x => x.id === m.groupId);
                    return (
                      <tr key={m.id}>
                        <td style={{ fontWeight: 600, opacity: 0.7 }}>{m.name}</td>
                        <td>
                          <span className="badge badge-gray">{g?.name || "—"}</span>
                        </td>
                        <td style={{ fontSize: 12, color: "var(--muted)" }}>
                          {m.archivedAt
                            ? new Date(m.archivedAt).toLocaleDateString("ar-EG")
                            : "—"}
                        </td>
                        <td>
                          <div className="row">
                            <button
                              className="btn btn-xs"
                              style={{
                                background: "#d1fae5",
                                color: "#065f46",
                                border: "none",
                              }}
                              onClick={() => handleRestoreMember(m)}
                            >
                              ↩ استعادة
                            </button>
                            <button
                              className="btn btn-xs"
                              style={{
                                background: "#fee2e2",
                                color: "#991b1b",
                                border: "none",
                              }}
                              onClick={() =>
                                setConfirm({
                                  msg: `حذف "${m.name}" نهائياً؟`,
                                  onYes: () => deleteMemberPerm(m),
                                })
                              }
                            >
                              🗑 حذف
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {confirm && (
        <Confirm msg={confirm.msg} onYes={confirm.onYes} onNo={() => setConfirm(null)} />
      )}
    </div>
  );
}
