import { FIELDS } from "@/features/dashboard/styles/dashboard-theme";
import { LegacyGroup, LegacyMember, SubmissionRecord } from "@/features/dashboard/types/dashboard-types";

export function exportPDF(sub: SubmissionRecord, groups: LegacyGroup[], members: LegacyMember[]) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="utf-8"/>
      <title>تقرير حضور - ${sub.date}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 20px; color: #1e293b; }
        h1 { font-size: 20px; border-bottom: 2px solid #6366f1; padding-bottom: 8px; }
        .group-header { background: #f1f5f9; padding: 8px 12px; font-weight: bold; margin-top: 16px; border-radius: 4px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
        th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center; }
        th { background: #f8fafc; }
        td:nth-child(2) { text-align: right; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <h1>📊 تقرير حضور الخدمة — ${sub.date}</h1>
      ${groups
        .filter(g => g.active)
        .map(g => {
          const gm = members.filter(m => m.groupId === g.id && m.active);
          return `
            <div class="group-header">أسرة: ${g.name} (${gm.length} عضو)</div>
            <table>
              <thead>
                <tr>
                  <th style="width:30px">#</th>
                  <th>الاسم</th>
                  ${FIELDS.map(f => `<th>${f.key}</th>`).join("")}
                </tr>
              </thead>
              <tbody>
                ${gm
                  .map((m, i) => {
                    const rec = ((sub.records || []) as Record<string, any>[]).find(r => r.memberId === m.id) || {};
                    return `
                      <tr>
                        <td>${i + 1}</td>
                        <td>${m.name}</td>
                        ${FIELDS.map(f => `<td>${rec[f.key] ? "✓" : ""}</td>`).join("")}
                      </tr>
                    `;
                  })
                  .join("")}
              </tbody>
            </table>
          `;
        })
        .join("")}
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 500);
}

export function exportFamilyReportPDF(
  group: LegacyGroup,
  members: LegacyMember[],
  submissions: SubmissionRecord[]
) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const gm = members.filter(m => m.groupId === group.id && m.active);
  const sortedSubs = [...submissions].sort((a, b) => a.dateISO.localeCompare(b.dateISO));
  const dates = sortedSubs.map(s => s.date);

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="utf-8"/>
      <title>تقرير أسرة ${group.name}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 20px; color: #1e293b; }
        h1 { font-size: 20px; border-bottom: 2px solid #6366f1; padding-bottom: 8px; }
        .meta { font-size: 13px; color: #64748b; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; }
        th, td { border: 1px solid #cbd5e1; padding: 5px 6px; text-align: center; }
        th { background: #f8fafc; }
        td:nth-child(2) { text-align: right; }
      </style>
    </head>
    <body>
      <h1>🏠 تقرير أسرة: ${group.name}</h1>
      <div class="meta">الخادم الرئيسي: ${group.mainServant || "—"} | عدد الأعضاء: ${gm.length}</div>
      <table>
        <thead>
          <tr>
            <th style="width:25px">#</th>
            <th>الاسم</th>
            ${dates.map(d => `<th>${d}</th>`).join("")}
            <th>نسبة الحضور</th>
          </tr>
        </thead>
        <tbody>
          ${gm
            .map((m, i) => {
              let attCount = 0;
              const atts = sortedSubs.map(s => {
                const rec = ((s.records || []) as Record<string, any>[]).find(r => r.memberId === m.id);
                const ok = rec && rec["حضور الخدمة"];
                if (ok) attCount++;
                return ok ? "✓" : "";
              });
              const pct = sortedSubs.length ? `${Math.round((attCount / sortedSubs.length) * 100)}%` : "0%";
              return `
                <tr>
                  <td>${i + 1}</td>
                  <td>${m.name}</td>
                  ${atts.map(a => `<td>${a}</td>`).join("")}
                  <td><strong>${pct}</strong></td>
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 500);
}

export function exportStatisticsPDF(
  groups: LegacyGroup[],
  members: LegacyMember[],
  submissions: SubmissionRecord[]
) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const totalMembers = members.filter(m => m.active).length;
  const totalWeeks = submissions.length;

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="utf-8"/>
      <title>التقرير الإحصائي الشامل</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 20px; color: #1e293b; }
        h1 { font-size: 20px; border-bottom: 2px solid #6366f1; padding-bottom: 8px; }
        .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
        .kpi { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px; text-align: center; }
        .kpi-val { font-size: 24px; font-weight: bold; color: #4338ca; }
        .kpi-lbl { font-size: 12px; color: #64748b; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
        th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center; }
        th { background: #f8fafc; }
        td:nth-child(1) { text-align: right; }
      </style>
    </head>
    <body>
      <h1>📈 التقرير الإحصائي الشامل للخدمة</h1>
      <div class="kpi-grid">
        <div class="kpi"><div class="kpi-val">${totalMembers}</div><div class="kpi-lbl">إجمالي المخدومين</div></div>
        <div class="kpi"><div class="kpi-val">${groups.filter(g => g.active).length}</div><div class="kpi-lbl">الأسر النشطة</div></div>
        <div class="kpi"><div class="kpi-val">${totalWeeks}</div><div class="kpi-lbl">الأسابيع المسجلة</div></div>
      </div>
      <h3>إحصائيات الأسر</h3>
      <table>
        <thead>
          <tr>
            <th>اسم الأسرة</th>
            <th>الخادم الرئيسي</th>
            <th>عدد الأعضاء</th>
          </tr>
        </thead>
        <tbody>
          ${groups
            .filter(g => g.active)
            .map(g => {
              const count = members.filter(m => m.groupId === g.id && m.active).length;
              return `
                <tr>
                  <td>${g.name}</td>
                  <td>${g.mainServant || "—"}</td>
                  <td>${count}</td>
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 500);
}

export function exportMemberProfilePDF(
  member: LegacyMember,
  group: LegacyGroup | undefined,
  attendanceHistory: Record<string, any>[],
  fieldStats: { key: string; icon: string; pct: number }[],
  notes: { title: string; category: string; content: string; createdAt: string }[]
) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="utf-8"/>
      <title>تقرير العضو - ${member.name}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 20px; color: #1e293b; }
        h1 { font-size: 20px; color: #4338ca; margin-bottom: 4px; }
        .sub { font-size: 13px; color: #64748b; margin-bottom: 16px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
        .box { border: 1px solid #cbd5e1; padding: 12px; border-radius: 6px; }
        .box-title { font-weight: bold; margin-bottom: 8px; font-size: 14px; color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
        .row { display: flex; justify-content: space-between; font-size: 12px; padding: 4px 0; border-bottom: 1px dashed #f1f5f9; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 8px; }
        th, td { border: 1px solid #cbd5e1; padding: 4px 6px; text-align: center; }
        th { background: #f8fafc; }
      </style>
    </head>
    <body>
      <h1>👤 ${member.name}</h1>
      <div class="sub">الأسرة: ${group?.name || "—"} | تاريخ الانضمام: ${member.joinedAt ? new Date(member.joinedAt).toLocaleDateString("ar-EG") : "—"}</div>
      
      <div class="grid">
        <div class="box">
          <div class="box-title">البيانات الشخصية</div>
          <div class="row"><span>اسم الأب:</span><span>${member.fatherName || "—"}</span></div>
          <div class="row"><span>هاتف العضو:</span><span>${member.phone || "—"}</span></div>
          <div class="row"><span>هاتف ولي الأمر:</span><span>${member.familyPhone || "—"}</span></div>
          <div class="row"><span>المدرسة / الجامعة:</span><span>${member.school || "—"}</span></div>
          <div class="row"><span>العنوان:</span><span>${member.address || "—"}</span></div>
        </div>
        <div class="box">
          <div class="box-title">نسب الحضور</div>
          ${fieldStats
            .map(f => `<div class="row"><span>${f.icon} ${f.key}:</span><span><strong>${f.pct}%</strong></span></div>`)
            .join("")}
        </div>
      </div>

      ${notes.length ? `
        <div class="box" style="margin-top:16px">
          <div class="box-title">ملاحظات الافتقاد والمتابعة</div>
          ${notes
            .map(
              n => `
            <div style="margin-bottom:8px; padding-bottom:8px; border-bottom:1px solid #f1f5f9">
              <div style="font-weight:bold; font-size:12px; color:#334155">${n.title} (${n.category})</div>
              <div style="font-size:11px; color:#475569">${n.content}</div>
            </div>
          `
            )
            .join("")}
        </div>
      ` : ""}
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 500);
}
