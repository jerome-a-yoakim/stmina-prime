import React, { useState } from "react";
import { FIELDS } from "@/features/dashboard/styles/dashboard-theme";
import { LegacyGroup, LegacyMember, SubmissionRecord } from "@/features/dashboard/types/dashboard-types";
import { Alert } from "@/features/dashboard/ui/alert";
import { Confirm } from "@/features/dashboard/ui/confirm-dialog";
import { exportFamilyReportPDF, exportPDF, exportStatisticsPDF } from "../utils/pdf-exporter";
import { exportWeeklyExcel } from "../utils/excel-exporter";

interface HistoryPageProps {
  submissions: SubmissionRecord[];
  groups: LegacyGroup[];
  members: LegacyMember[];
  onDelete: (id: string) => Promise<void>;
  onExportOverview: () => void;
}

export function HistoryPage({
  submissions,
  groups,
  members,
  onDelete,
  onExportOverview,
}: HistoryPageProps) {
  const [selectedSub, setSelectedSub] = useState<SubmissionRecord | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ type: string; msg: string } | null>(null);

  const showFlash = (type: string, msg: string) => {
    setFlash({ type, msg });
    setTimeout(() => setFlash(null), 3000);
  };

  const activeGroups = groups.filter(g => g.active);
  const activeMembers = members.filter(m => m.active);

  const totalMembers = activeMembers.length;

  const filteredSubs = submissions.filter(s => {
    const dOk = !search || s.date.includes(search) || s.dateISO.includes(search);
    return dOk;
  });

  return (
    <div>
      {flash && <Alert type={flash.type}>{flash.msg}</Alert>}

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <h3>📊 التصدير والتقارير العامة</h3>
        </div>
        <div className="card-body">
          <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
            <button className="btn btn-primary" onClick={onExportOverview}>
              📊 تصدير شيت إكسل شامل لكل الأسابيع
            </button>
            <button
              className="btn btn-outline"
              onClick={() => exportStatisticsPDF(groups, members, submissions)}
            >
              🖨 طباعة التقرير الإحصائي العام (PDF)
            </button>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <h3>🏠 تقارير حسب الأسرة (شيتات الأسابيع)</h3>
        </div>
        <div className="card-body">
          <div className="row" style={{ gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>اختر الأسرة:</span>
            <select
              className="inp"
              style={{ maxWidth: 220 }}
              value={selectedGroup}
              onChange={e => setSelectedGroup(e.target.value)}
            >
              <option value="all">جميع الأسر</option>
              {activeGroups.map(g => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            {selectedGroup !== "all" && (
              <button
                className="btn btn-outline btn-sm"
                onClick={() => {
                  const g = groups.find(x => x.id === selectedGroup);
                  if (g) exportFamilyReportPDF(g, members, submissions);
                }}
              >
                🖨 طباعة تقرير الأسرة الشامل (PDF)
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>📋 سجل الأسابيع المسجلة ({submissions.length})</h3>
        </div>
        <div className="card-body">
          <div className="row" style={{ marginBottom: 12 }}>
            <input
              className="inp inp-sm"
              placeholder="🔍 بحث بالتاريخ..."
              style={{ maxWidth: 220 }}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="scroll-x">
            <table className="tbl">
              <thead>
                <tr>
                  <th>التاريخ</th>
                  <th>عدد الحاضرين</th>
                  <th>نسبة الحضور</th>
                  <th>إجراءات والتصدير</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubs.map(s => {
                  const presentCount = (s.records || []).filter(r => r["حضور الخدمة"]).length;
                  const pct = totalMembers ? Math.round((presentCount / totalMembers) * 100) : 0;
                  return (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 700 }}>📅 {s.date}</td>
                      <td>
                        <span className="badge badge-green">{presentCount} عضو</span>
                      </td>
                      <td>
                        <span className="badge badge-indigo">{pct}%</span>
                      </td>
                      <td>
                        <div className="row" style={{ gap: 6 }}>
                          <button
                            className="btn btn-ghost btn-xs"
                            onClick={() => setSelectedSub(s)}
                          >
                            👁 تفاصيل
                          </button>
                          <button
                            className="btn btn-outline btn-xs"
                            onClick={() => exportWeeklyExcel(s, groups, members)}
                          >
                            📊 إكسل
                          </button>
                          <button
                            className="btn btn-outline btn-xs"
                            onClick={() => exportPDF(s, groups, members)}
                          >
                            🖨 طباعة PDF
                          </button>
                          <button
                            className="btn btn-xs btn-danger"
                            onClick={() => setConfirmDel(s.id)}
                          >
                            🗑 حذف
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!filteredSubs.length && (
                  <tr>
                    <td colSpan={4} className="empty">
                      لا توجد أسابيع مسجلة
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedSub && (
        <div className="modal-bg" onClick={() => setSelectedSub(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📅 تفاصيل أسبوع {selectedSub.date}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedSub(null)}>
                ✕
              </button>
            </div>
            <div className="modal-body scroll-x">
              {activeGroups.map(g => {
                const gm = activeMembers.filter(m => m.groupId === g.id);
                return (
                  <div key={g.id} style={{ marginBottom: 16 }}>
                    <div style={{ fontWeight: 700, marginBottom: 6, color: "var(--indigo)" }}>
                      {g.name} ({gm.length} عضو)
                    </div>
                    <table className="tbl" style={{ fontSize: 12 }}>
                      <thead>
                        <tr>
                          <th>الاسم</th>
                          {FIELDS.map(f => (
                            <th key={f.key}>{f.key}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {gm.map(m => {
                          const rec = ((selectedSub.records || []) as Record<string, any>[]).find(r => r.memberId === m.id) || {};
                          return (
                            <tr key={m.id}>
                              <td>{m.name}</td>
                              {FIELDS.map(f => (
                                <td key={f.key}>
                                  {rec[f.key] ? (
                                    <span className="badge badge-green">✓</span>
                                  ) : (
                                    <span style={{ color: "var(--muted)" }}>—</span>
                                  )}
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setSelectedSub(null)}>
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDel && (
        <Confirm
          msg="هل أنت تأكد من حذف بيانات هذا الأسبوع؟ لا يمكن التراجع عن هذا الإجراء."
          onYes={async () => {
            await onDelete(confirmDel);
            setConfirmDel(null);
            showFlash("success", "🗑 تم حذف الأسبوع بنجاح");
          }}
          onNo={() => setConfirmDel(null)}
        />
      )}
    </div>
  );
}
