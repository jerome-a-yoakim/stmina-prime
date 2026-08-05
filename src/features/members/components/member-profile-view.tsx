import React, { useState, useEffect, useCallback } from "react";
import { hasPermission } from "@/features/auth/authorization/permission-checker";
import {
  createMemberNote,
  deleteMemberNote,
  listNotesForMember,
  updateMemberNote,
} from "@/features/members/data/member-note-service";
import { updateMember } from "@/features/members/data/member-service";
import { MemberVisitationHistory } from "@/features/visitation/components/member-visitation-history";
import { MemberNoteModal, NoteFormData } from "./member-note-modal";
import { FIELDS } from "@/features/dashboard/styles/dashboard-theme";
import {
  ActivityItem,
  DashboardUser,
  LegacyGroup,
  LegacyMember,
  MemberNoteItem,
  SubmissionRecord,
} from "@/features/dashboard/types/dashboard-types";
import { Alert } from "@/features/dashboard/ui/alert";
import { exportMemberProfilePDF } from "@/features/reports/utils/pdf-exporter";

interface MemberProfilePageProps {
  currentUser: DashboardUser;
  member: LegacyMember;
  groups: LegacyGroup[];
  members: LegacyMember[];
  submissions: SubmissionRecord[];
  activities: ActivityItem[];
  onBack: () => void;
  onUpdate: () => Promise<void>;
}

export function MemberProfilePage({
  currentUser,
  member,
  groups,
  members,
  submissions,
  activities,
  onBack,
  onUpdate,
}: MemberProfilePageProps) {
  const group = groups.find(g => g.id === member.groupId);
  const m = members.find(x => x.id === member.id) || member;
  const [editing, setEditing] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"info" | "notes" | "visitation">("info");
  const [form, setForm] = useState({
    givenName: m.givenName || m.name || "",
    fatherName: m.fatherName || "",
    phone: m.phone || "",
    familyPhone: m.familyPhone || "",
    address: m.address || "",
    additionalFamilyPhone: m.additionalFamilyPhone || "",
    birthDate: m.birthDate || "",
    school: m.school || "",
    brotherOfLord: m.brotherOfLord || false,
    activities: m.activities || [],
    notes: m.notes || "",
  });

  const [notesList, setNotesList] = useState<MemberNoteItem[]>([]);
  const [notesLoading, setNotesLoading] = useState<boolean>(true);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [searchNote, setSearchNote] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [noteModal, setNoteModal] = useState<{
    mode: "add" | "edit";
    note?: MemberNoteItem;
  } | null>(null);
  const [nForm, setNForm] = useState<NoteFormData>({
    title: "",
    content: "",
    category: "General",
    isImportant: false,
  });

  const refreshNotes = useCallback(async () => {
    setNotesLoading(true);
    setNoteError(null);
    try {
      const fresh = await listNotesForMember(m.id);
      setNotesList(fresh as MemberNoteItem[]);
    } catch (e: any) {
      setNoteError(e.message || "تعذر تحميل الملاحظات");
    } finally {
      setNotesLoading(false);
    }
  }, [m.id]);

  useEffect(() => {
    refreshNotes();
  }, [refreshNotes]);

  const userAcc = currentUser as any;
  const canEditProfile = hasPermission(userAcc, "edit_member_profiles");
  const canViewNotes = hasPermission(userAcc, "view_notes");
  const canAddNotes = hasPermission(userAcc, "add_notes");
  const canEditNotes = hasPermission(userAcc, "edit_notes");
  const canDeleteNotes = hasPermission(userAcc, "delete_notes");
  const canExportPDF = hasPermission(userAcc, "export_member_report");

  const attendanceHistory = submissions
    .map(sub => {
      const rec =
        ((sub.records || []) as Record<string, any>[]).find(r => r.memberId === m.id) || {};
      return { date: sub.date, dateISO: sub.dateISO, ...rec } as Record<string, any>;
    })
    .sort((a, b) => b.dateISO.localeCompare(a.dateISO));

  const totalWeeks = attendanceHistory.length;
  const attended = attendanceHistory.filter(r => r["حضور الخدمة"]).length;
  const attendPct = totalWeeks ? Math.round((attended / totalWeeks) * 100) : 0;

  const fieldStats = FIELDS.map(f => ({
    ...f,
    count: attendanceHistory.filter(r => r[f.key]).length,
    pct: totalWeeks
      ? Math.round((attendanceHistory.filter(r => r[f.key]).length / totalWeeks) * 100)
      : 0,
  }));

  const saveProfile = async () => {
    setSaving(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      if (!form.givenName.trim()) throw new Error("اسم المخدوم مطلوب");
      if (form.birthDate && form.birthDate > today)
        throw new Error("تاريخ الميلاد لا يمكن أن يكون في المستقبل");
      for (const phone of [form.phone, form.familyPhone, form.additionalFamilyPhone]) {
        if (phone.trim().length > 30)
          throw new Error("رقم الهاتف يجب ألا يتجاوز 30 حرفًا");
      }
      const optional = (value: string) => value.trim() || null;
      const fullName = `${form.givenName.trim()} ${form.fatherName.trim()}`
        .replace(/\s+/g, " ")
        .trim();
      await updateMember(m.id, {
        fullName,
        givenName: form.givenName.trim(),
        fatherName: optional(form.fatherName),
        phone: optional(form.phone),
        familyPhone: optional(form.familyPhone),
        additionalFamilyPhone: optional(form.additionalFamilyPhone),
        address: optional(form.address),
        school: optional(form.school),
        birthDate: form.birthDate || null,
        notes: optional(form.notes),
        brotherOfLord: form.brotherOfLord,
      });
      await onUpdate();
      setEditing(false);
    } catch (e: any) {
      alert(`فشل حفظ البيانات: ${e.message || "خطأ غير متوقع"}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNote = async () => {
    if (!nForm.title.trim() || !nForm.content.trim())
      return alert("عنوان ومحتوى الملاحظة مطلوبان");
    try {
      if (noteModal?.mode === "add") {
        await createMemberNote({
          memberId: m.id,
          title: nForm.title.trim(),
          content: nForm.content.trim(),
          category: nForm.category,
          isImportant: nForm.isImportant,
          createdBy: currentUser?.id || null,
        });
      } else if (noteModal?.note) {
        await updateMemberNote(noteModal.note.id, {
          title: nForm.title.trim(),
          content: nForm.content.trim(),
          category: nForm.category,
          isImportant: nForm.isImportant,
        });
      }
      await refreshNotes();
      setNoteModal(null);
    } catch (e: any) {
      alert(`فشل حفظ الملاحظة: ${e.message || "خطأ غير متوقع"}`);
    }
  };

  const handleDeleteNote = async (nId: string) => {
    if (!confirm("هل أنت تأكد من حذف هذه الملاحظة؟")) return;
    try {
      await deleteMemberNote(nId);
      await refreshNotes();
    } catch (e: any) {
      alert(`فشل حذف الملاحظة: ${e.message || "خطأ غير متوقع"}`);
    }
  };

  const filteredNotes = notesList.filter(n => {
    const q = searchNote.trim().toLowerCase();
    const matchQ =
      !q || n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q);
    const matchC = filterCategory === "all" || n.category === filterCategory;
    return matchQ && matchC;
  });

  const initials = m.name
    .split(" ")
    .slice(0, 2)
    .map(w => w[0])
    .join("");

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <button className="btn btn-ghost btn-sm" onClick={onBack}>
          ← العودة لجدول الأعضاء
        </button>
        {canExportPDF && (
          <button
            className="btn btn-outline btn-sm"
            onClick={() =>
              exportMemberProfilePDF(m, group, attendanceHistory, fieldStats, notesList)
            }
          >
            🖨 تصدير تقرير العضو الشامل (PDF)
          </button>
        )}
      </div>

      <div className="profile-header">
        <div className="profile-avatar">{initials}</div>
        <div>
          <div className="profile-name">{m.name}</div>
          <div className="profile-meta">{group?.name || "—"}</div>
          <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span className="badge" style={{ background: "rgba(255,255,255,.2)", color: "#fff" }}>
              📅 {totalWeeks} أسبوع
            </span>
            <span className="badge" style={{ background: "rgba(255,255,255,.2)", color: "#fff" }}>
              ✅ {attendPct}% حضور
            </span>
            {m.brotherOfLord && (
              <span className="badge" style={{ background: "#fef3c7", color: "#92400e" }}>
                ✝️ أخ الرب
              </span>
            )}
          </div>
        </div>
        {canEditProfile && (
          <div style={{ marginRight: "auto" }}>
            <button
              className="btn btn-sm"
              style={{
                background: "rgba(255,255,255,.15)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,.3)",
              }}
              onClick={() => setEditing(true)}
            >
              ✏️ تعديل البيانات
            </button>
          </div>
        )}
      </div>

      <div className="tabs" style={{ marginBottom: 18 }}>
        <button
          className={`tab ${activeTab === "info" ? "active" : ""}`}
          onClick={() => setActiveTab("info")}
        >
          📋 الملف الشخصي والإحصائيات
        </button>
        <button
          className={`tab ${activeTab === "visitation" ? "active" : ""}`}
          onClick={() => setActiveTab("visitation")}
        >
          ☎ سجل الافتقاد
        </button>
        {canViewNotes && (
          <button
            className={`tab ${activeTab === "notes" ? "active" : ""}`}
            onClick={() => setActiveTab("notes")}
          >
            📝 ملاحظات المتابعة والافتفاد ({notesList.length})
          </button>
        )}
      </div>

      {activeTab === "info" && (
        <div className="grid-2" style={{ marginBottom: 16 }}>
          <div className="card">
            <div className="card-header">
              <h3>📋 البيانات الشخصية</h3>
            </div>
            <div className="card-body">
              {[
                { label: "اسم الأب", val: m.fatherName || "—" },
                { label: "📞 هاتف العضو", val: m.phone || "—" },
                { label: "👨‍👩‍👧 هاتف ولي الأمر", val: m.familyPhone || "—" },
                { label: "هاتف إضافي لولي الأمر", val: m.additionalFamilyPhone || "—" },
                { label: "🏠 العنوان", val: m.address || "—" },
                { label: "🏫 المدرسة / الجامعة", val: m.school || "—" },
                {
                  label: "تاريخ الميلاد",
                  val: m.birthDate
                    ? new Date(`${m.birthDate}T12:00:00`).toLocaleDateString("ar-EG")
                    : "—",
                },
                { label: "✝️ أخ الرب", val: m.brotherOfLord ? "نعم" : "لا" },
                { label: "ملاحظات الانضمام", val: m.notes || "—" },
              ].map(({ label, val }) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "10px 0",
                    borderBottom: "1px solid var(--border)",
                    fontSize: 13,
                  }}
                >
                  <span style={{ color: "var(--muted)", fontWeight: 600 }}>{label}</span>
                  <span style={{ fontWeight: 700 }}>{val}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>📊 إحصائيات الحضور</h3>
            </div>
            <div className="card-body">
              {fieldStats.map(f => (
                <div key={f.key} className="stat-bar-row">
                  <span className="stat-bar-label">
                    {f.icon} {f.key}
                  </span>
                  <div className="stat-bar-wrap">
                    <div
                      className="stat-bar"
                      style={{ width: `${f.pct}%`, background: f.color }}
                    />
                  </div>
                  <span className="stat-bar-val">{f.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "visitation" && <MemberVisitationHistory memberId={String(m.id)} />}

      {activeTab === "notes" && canViewNotes && (
        <div className="card">
          <div className="card-header" style={{ justifyContent: "space-between" }}>
            <h3>📝 ملاحظات المتابعة والافتفاد</h3>
            {canAddNotes && (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setNForm({
                    title: "",
                    content: "",
                    category: "General",
                    isImportant: false,
                  });
                  setNoteModal({ mode: "add" });
                }}
              >
                + إضافة ملاحظة جديدة
              </button>
            )}
          </div>
          <div className="card-body">
            <div className="row" style={{ marginBottom: 16, gap: 10 }}>
              <input
                className="inp inp-sm"
                style={{ flex: 1 }}
                placeholder="🔍 بحث في الملاحظات..."
                value={searchNote}
                onChange={e => setSearchNote(e.target.value)}
              />
              <select
                className="inp inp-sm"
                style={{ width: 180 }}
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
              >
                <option value="all">جميع التصنيفات</option>
                <option value="General">عامة (General)</option>
                <option value="Spiritual">روحية (Spiritual)</option>
                <option value="Follow-up">متابعة (Follow-up)</option>
                <option value="Family">عائلية (Family)</option>
                <option value="Health">صحية (Health)</option>
                <option value="Education">تعليمية (Education)</option>
                <option value="Other">أخرى (Other)</option>
              </select>
            </div>

            {noteError && <Alert type="error">⚠️ {noteError}</Alert>}
            {notesLoading ? (
              <div className="empty">
                <div className="ei">⏳</div>جارٍ تحميل الملاحظات...
              </div>
            ) : !filteredNotes.length ? (
              <div className="empty">
                <div className="ei">📝</div>لا توجد ملاحظات مطابقة
              </div>
            ) : (
              <div className="col" style={{ gap: 12 }}>
                {filteredNotes.map(n => (
                  <div
                    key={n.id}
                    style={{
                      border: "1px solid #F2E8E4",
                      borderRight: "4px solid #FB6C00",
                      borderRadius: 10,
                      padding: 14,
                      background: "#ffffff",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 6,
                      }}
                    >
                      <h4 style={{ fontSize: 15, fontWeight: 800, color: "#1E1B4B" }}>
                        {n.title}
                      </h4>
                      <div className="row" style={{ gap: 6 }}>
                        <span className="badge badge-amber">{n.category}</span>
                        {n.isImportant && <span className="badge badge-red">مهمة</span>}
                        {canEditNotes && (
                          <button
                            className="btn btn-xs btn-ghost"
                            onClick={() => {
                              setNForm({
                                title: n.title,
                                content: n.content,
                                category: n.category,
                                isImportant: n.isImportant,
                              });
                              setNoteModal({ mode: "edit", note: n });
                            }}
                          >
                            ✏️
                          </button>
                        )}
                        {canDeleteNotes && (
                          <button
                            className="btn btn-xs btn-danger"
                            onClick={() => handleDeleteNote(n.id)}
                          >
                            🗑
                          </button>
                        )}
                      </div>
                    </div>
                    <p
                      style={{
                        fontSize: 13,
                        color: "#374151",
                        whiteSpace: "pre-wrap",
                        marginBottom: 8,
                      }}
                    >
                      {n.content}
                    </p>
                    <div style={{ fontSize: 11, color: "#9CA3AF" }}>
                      📅 أنشئت: {new Date(n.createdAt).toLocaleDateString("ar-EG")} | 👤 القائم
                      بالتسجيل: {n.createdBy}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {noteModal && (
        <MemberNoteModal
          mode={noteModal.mode}
          form={nForm}
          onChange={setNForm}
          onSave={handleSaveNote}
          onClose={() => setNoteModal(null)}
        />
      )}

      {editing && (
        <div className="modal-bg" onClick={() => setEditing(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>✏️ تعديل بيانات العضو</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body registration-profile-form">
              <h4>البيانات الأساسية</h4>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">اسم المخدوم</label>
                  <input
                    className="inp"
                    maxLength={80}
                    value={form.givenName}
                    onChange={e => setForm(p => ({ ...p, givenName: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">اسم الأب</label>
                  <input
                    className="inp"
                    maxLength={80}
                    value={form.fatherName}
                    onChange={e => setForm(p => ({ ...p, fatherName: e.target.value }))}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">تاريخ الميلاد</label>
                  <input
                    className="inp"
                    type="date"
                    max={new Date().toISOString().slice(0, 10)}
                    value={form.birthDate}
                    onChange={e => setForm(p => ({ ...p, birthDate: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">🏫 المدرسة / الجامعة</label>
                  <input
                    className="inp"
                    maxLength={120}
                    value={form.school}
                    onChange={e => setForm(p => ({ ...p, school: e.target.value }))}
                  />
                </div>
              </div>
              <h4>بيانات التواصل</h4>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">📞 هاتف المخدوم</label>
                  <input
                    className="inp"
                    type="tel"
                    maxLength={30}
                    value={form.phone}
                    onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">هاتف ولي الأمر</label>
                  <input
                    className="inp"
                    type="tel"
                    maxLength={30}
                    value={form.familyPhone}
                    onChange={e => setForm(p => ({ ...p, familyPhone: e.target.value }))}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">هاتف إضافي لولي الأمر</label>
                  <input
                    className="inp"
                    type="tel"
                    maxLength={30}
                    value={form.additionalFamilyPhone}
                    onChange={e => setForm(p => ({ ...p, additionalFamilyPhone: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">🏠 محل الإقامة</label>
                  <input
                    className="inp"
                    maxLength={300}
                    value={form.address}
                    onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                  />
                </div>
              </div>
              <h4>بيانات الخدمة</h4>
              <div className="form-group">
                <label className="form-label">ملاحظات الانضمام للخدمة</label>
                <textarea
                  className="inp"
                  rows={4}
                  maxLength={1000}
                  value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="toggle-wrap">
                  <div className="toggle">
                    <input
                      type="checkbox"
                      checked={form.brotherOfLord}
                      onChange={e => setForm(p => ({ ...p, brotherOfLord: e.target.checked }))}
                    />
                    <span className="toggle-sl" />
                  </div>
                  <span className="form-label" style={{ margin: 0 }}>
                    ✝️ أخ الرب
                  </span>
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-ghost"
                onClick={() => setEditing(false)}
                disabled={saving}
              >
                إلغاء
              </button>
              <button
                className="btn btn-primary"
                onClick={saveProfile}
                disabled={saving}
              >
                {saving ? "⏳ جارٍ الحفظ..." : "حفظ البيانات"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
