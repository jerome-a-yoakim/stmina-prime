import React, { useState, useEffect, useCallback } from "react";
import { ATTENDANCE_FIELDS, FIELDS, VISITATION_READONLY_FIELDS } from "@/features/dashboard/styles/dashboard-theme";
import { DashboardUser, LegacyGroup, LegacyMember, SubmissionRecord } from "@/features/dashboard/types/dashboard-types";
import { Alert } from "@/features/dashboard/ui/alert";
import { Confirm } from "@/features/dashboard/ui/confirm-dialog";
import { Toggle } from "@/features/dashboard/ui/toggle";
import { getNextFriday, isFriday } from "@/features/dashboard/utils/date-helpers";

interface DataEntryPageProps {
  currentUser: DashboardUser;
  groups: LegacyGroup[];
  members: LegacyMember[];
  submissions: SubmissionRecord[];
  onSave: (sub: SubmissionRecord, isEdit: boolean) => Promise<SubmissionRecord>;
}

export function DataEntryPage({
  currentUser,
  groups,
  members,
  submissions,
  onSave,
}: DataEntryPageProps) {
  const allowedGroups =
    currentUser.role === "admin"
      ? groups.filter(g => g.active)
      : groups.filter(g => g.active && currentUser.assignedGroups.includes(g.name));

  const [selGroup, setSelGroup] = useState<string | null>(allowedGroups[0]?.id || null);
  const [date, setDate] = useState<string>(getNextFriday);
  const [records, setRecords] = useState<Record<string, Record<string, boolean | string>>>({});
  const [allMode, setAllMode] = useState<boolean>(false);
  const [flash, setFlash] = useState<{ type: string; msg: string } | null>(null);
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [confirmSave, setConfirmSave] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [meetingVisitation, setMeetingVisitation] = useState<{
    week?: any;
    records?: Record<string, Record<string, boolean>>;
  }>({ week: null, records: {} });
  const [visitationLoading, setVisitationLoading] = useState<boolean>(false);

  const showFlash = (type: string, msg: string) => {
    setFlash({ type, msg });
    setTimeout(() => setFlash(null), 4000);
  };

  const isDuplicate = date && !editingSubId && submissions.some(s => s.dateISO === date);
  const friday = isFriday(date);
  const getGroupMembers = (gid: string) => members.filter(m => m.groupId === gid && m.active);

  const initRecords = useCallback(
    (sub: SubmissionRecord | null = null) => {
      const init: Record<string, Record<string, boolean | string>> = {};
      allowedGroups.forEach(g => {
        getGroupMembers(g.id).forEach(m => {
          const rec = sub ? (sub.records || []).find(r => r.memberId === m.id) : null;
          init[m.id] = { memberId: m.id };
          FIELDS.forEach(f => {
            init[m.id][f.key] = rec ? !!rec[f.key] : false;
          });
        });
      });
      setRecords(init);
    },
    [allowedGroups, members]
  );

  useEffect(() => {
    initRecords();
  }, []);

  useEffect(() => {
    if (!date) {
      setMeetingVisitation({ week: null, records: {} });
      return;
    }
    let active = true;
    setVisitationLoading(true);
    fetch(`/api/visitation?meetingDate=${encodeURIComponent(date)}`, { cache: "no-store" })
      .then(async response => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "تعذر تحميل بيانات الافتقاد");
        if (active) setMeetingVisitation(body);
      })
      .catch(error => {
        if (active) showFlash("error", error.message || "تعذر تحميل بيانات الافتقاد");
      })
      .finally(() => {
        if (active) setVisitationLoading(false);
      });
    return () => {
      active = false;
    };
  }, [date]);

  const loadExisting = (sub: SubmissionRecord) => {
    setDate(sub.dateISO);
    setEditingSubId(sub.id);
    initRecords(sub);
    showFlash("info", `✏️ تحرير بيانات أسبوع ${sub.date}`);
  };

  const toggle = (mid: string, field: string, val: boolean) => {
    setRecords(p => {
      const updated = { ...p, [mid]: { ...p[mid], [field]: val } };
      if (field === "خدمة القداس" && val) {
        updated[mid]["حضور القداس"] = true;
      }
      return updated;
    });
  };

  const toggleAll = (gid: string, field: string, val: boolean) => {
    const mids = getGroupMembers(gid).map(m => m.id);
    setRecords(p => {
      const n = { ...p };
      mids.forEach(id => {
        n[id] = { ...n[id], [field]: val };
        if (field === "خدمة القداس" && val) n[id]["حضور القداس"] = true;
      });
      return n;
    });
  };

  const completion = (gid: string) => {
    const ms = getGroupMembers(gid);
    if (!ms.length) return 0;
    const yes = ms.reduce(
      (a, m) => a + ATTENDANCE_FIELDS.filter(f => records[m.id]?.[f.key]).length,
      0
    );
    return Math.round((yes / (ms.length * ATTENDANCE_FIELDS.length)) * 100);
  };

  const buildSub = (): SubmissionRecord => ({
    id: editingSubId || undefined!,
    date: new Date(date + "T12:00:00").toLocaleDateString("ar-EG"),
    dateISO: date,
    records: Object.values(records) as any,
    submittedBy: currentUser.id,
    groupIds: allowedGroups.map(g => g.id),
  });

  const handleSaveOnly = async () => {
    if (!date) return showFlash("error", "الرجاء تحديد التاريخ أولاً");
    if (!friday) return showFlash("error", "⚠️ يجب اختيار يوم الجمعة فقط");
    const sub = buildSub();
    setSaving(true);
    try {
      await onSave(sub, !!editingSubId);
      showFlash(
        "success",
        editingSubId ? "✅ تم تحديث البيانات بنجاح" : "✅ تم حفظ البيانات بنجاح"
      );
      setEditingSubId(null);
      setConfirmSave(false);
    } catch (e: any) {
      showFlash("error", `❌ فشل حفظ البيانات: ${e.message || "خطأ غير متوقع"}`);
    } finally {
      setSaving(false);
    }
  };

  const activeGroups = allMode ? allowedGroups : allowedGroups.filter(g => g.id === selGroup);

  return (
    <div>
      {flash && <Alert type={flash.type}>{flash.msg}</Alert>}
      {isDuplicate && <Alert type="warn">⚠️ يوجد بيانات مسجلة بالفعل لهذا التاريخ.</Alert>}
      {date && !friday && (
        <Alert type="error">⛔ التاريخ المحدد ليس يوم جمعة. يُسمح بتسجيل أيام الجمعة فقط.</Alert>
      )}
      {meetingVisitation.week && (
        <Alert type="info">🔒 بيانات الافتقاد معروضة للقراءة فقط من أسبوع الخدمة المغلق.</Alert>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <div
          className="card-body"
          style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}
        >
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">تاريخ الأسبوع (جمعة فقط)</label>
            <input
              type="date"
              className="inp"
              style={{ width: 200 }}
              value={date}
              onChange={e => {
                if (!isFriday(e.target.value)) {
                  setDate(e.target.value);
                  showFlash("error", "⛔ يجب اختيار يوم الجمعة فقط");
                } else {
                  setDate(e.target.value);
                }
              }}
            />
            {date && (
              <div
                style={{
                  fontSize: 11,
                  marginTop: 3,
                  color: friday ? "#10b981" : "#ef4444",
                  fontWeight: 700,
                }}
              >
                {friday ? "✅ يوم جمعة" : "⛔ ليس يوم جمعة"}
              </div>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Toggle checked={allMode} onChange={setAllMode} />
            <span style={{ fontSize: 13, fontWeight: 700 }}>إدخال جميع الأسر</span>
          </div>
          {editingSubId && <span className="badge badge-amber">⚠️ وضع التحرير</span>}
        </div>
      </div>

      {currentUser.role === "admin" && submissions.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <h3>✏️ تحرير أسبوع سابق</h3>
          </div>
          <div className="card-body" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {[...submissions]
              .reverse()
              .slice(0, 8)
              .map(s => (
                <button
                  key={s.id}
                  className={`btn btn-ghost btn-sm ${editingSubId === s.id ? "btn-amber" : ""}`}
                  onClick={() => loadExisting(s)}
                >
                  ✏️ {s.date}
                </button>
              ))}
            {editingSubId && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setEditingSubId(null);
                  setDate(getNextFriday());
                  initRecords();
                }}
              >
                × إلغاء
              </button>
            )}
          </div>
        </div>
      )}

      {!allMode && (
        <div className="group-chips">
          {allowedGroups.map(g => (
            <button
              key={g.id}
              className={`gchip ${selGroup === g.id ? "sel" : ""}`}
              onClick={() => setSelGroup(g.id)}
            >
              {g.name}
              <span style={{ opacity: 0.75, fontSize: 11 }}>{completion(g.id)}%</span>
            </button>
          ))}
        </div>
      )}

      {activeGroups.map(g => {
        const gm = getGroupMembers(g.id);
        return (
          <div key={g.id} className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <h3>
                {g.name}{" "}
                <span className="badge badge-indigo" style={{ marginRight: 8 }}>
                  {gm.length} عضو
                </span>
              </h3>
              <div className="row">
                <div className="prog-wrap" style={{ width: 100 }}>
                  <div
                    className="prog"
                    style={{ width: `${completion(g.id)}%`, background: "var(--indigo)" }}
                  />
                </div>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>{completion(g.id)}%</span>
              </div>
            </div>
            <div className="card-body scroll-x">
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ minWidth: 180 }}>الاسم</th>
                    {ATTENDANCE_FIELDS.map(f => (
                      <th key={f.key}>
                        <div className="fh">
                          <span className="fh-lbl">
                            {f.icon} {f.key}
                          </span>
                          <div className="fh-btns">
                            <button
                              className="btn btn-xs"
                              style={{ background: "#d1fae5", color: "#065f46", border: "none" }}
                              onClick={() => toggleAll(g.id, f.key, true)}
                            >
                              كل
                            </button>
                            <button
                              className="btn btn-xs"
                              style={{ background: "#fee2e2", color: "#991b1b", border: "none" }}
                              onClick={() => toggleAll(g.id, f.key, false)}
                            >
                              لا
                            </button>
                          </div>
                        </div>
                      </th>
                    ))}
                    {VISITATION_READONLY_FIELDS.map(f => (
                      <th key={f.key}>
                        <div className="fh">
                          <span className="fh-lbl">
                            {f.icon} {f.label}
                          </span>
                          <span className="badge badge-blue">للقراءة فقط</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {gm.map(m => (
                    <tr key={m.id}>
                      <td style={{ fontWeight: 600 }}>{m.name}</td>
                      {ATTENDANCE_FIELDS.map(f => (
                        <td key={f.key}>
                          <Toggle
                            checked={!!records[m.id]?.[f.key]}
                            onChange={v => toggle(m.id, f.key, v)}
                          />
                        </td>
                      ))}
                      {VISITATION_READONLY_FIELDS.map(f => {
                        const visited = !!meetingVisitation.records?.[m.id]?.[f.typeCode];
                        return (
                          <td key={f.key}>
                            <span
                              title="يُدار من صفحة حالة الافتقاد"
                              style={{
                                display: "inline-flex",
                                minWidth: 54,
                                justifyContent: "center",
                                padding: "6px 9px",
                                borderRadius: 999,
                                fontSize: 12,
                                fontWeight: 800,
                                color: visited ? "#166534" : "var(--muted)",
                                background: visited ? "#dcfce7" : "var(--surface)",
                              }}
                            >
                              {visitationLoading ? "…" : visited ? "✓ تم" : "—"}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {!gm.length && (
                    <tr>
                      <td
                        colSpan={7}
                        style={{ textAlign: "center", color: "var(--muted)", padding: 20 }}
                      >
                        لا يوجد أعضاء
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      <div className="row" style={{ marginTop: 16, padding: "14px 0", gap: 10 }}>
        <button
          className="btn btn-primary"
          disabled={!friday || saving}
          onClick={() => (isDuplicate ? setConfirmSave(true) : handleSaveOnly())}
        >
          {saving
            ? "⏳ جارٍ الحفظ..."
            : `💾 ${editingSubId ? "تحديث البيانات" : "حفظ البيانات"}`}
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => {
            initRecords();
            showFlash("info", "تم مسح البيانات");
          }}
        >
          ↺ مسح الكل
        </button>
      </div>

      {confirmSave && (
        <Confirm
          msg={`يوجد بيانات بالفعل بتاريخ ${new Date(date + "T12:00:00").toLocaleDateString(
            "ar-EG"
          )}. هل تريد الحفظ على أي حال؟`}
          onYes={handleSaveOnly}
          onNo={() => setConfirmSave(false)}
        />
      )}
    </div>
  );
}
