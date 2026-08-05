import { APP_NAME, APP_SUBTITLE } from "../styles/dashboard-theme";
import { LegacyGroup, LegacyMember, MemberNoteItem, SubmissionRecord } from "../types/dashboard-types";

export function exportPDF(title: string, htmlContent: string): void {
  if (typeof window === "undefined") return;
  const win = window.open("", "_blank");
  if (!win) return alert("يرجى السماح بفتح النوافذ المنبثقة للطباعة");
  win.document.write(`<!DOCTYPE html><html dir="rtl"><head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
      body{font-family:'Cairo',sans-serif;direction:rtl;margin:0;padding:20px;color:#1e1b4b;background:#fff}
      h1{color:#1e1b4b;font-size:20px;border-bottom:3px solid #6366f1;padding-bottom:8px;margin-bottom:16px}
      h2{color:#4f46e5;font-size:15px;margin:16px 0 8px}
      table{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:12px}
      th{background:#1e1b4b;color:#fff;padding:8px;text-align:right}
      td{padding:6px 8px;border-bottom:1px solid #e5e7eb}
      tr:nth-child(even) td{background:#f8fafc}
      .badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700}
      .yes{background:#d1fae5;color:#065f46} .no{background:#fee2e2;color:#991b1b}
      .header{text-align:center;margin-bottom:20px;padding-bottom:16px;border-bottom:2px solid #e5e7eb}
      .header h1{border:none;font-size:24px} .header p{color:#6b7280;font-size:13px}
      @media print{body{margin:0}}
    </style>
  </head><body>
    <div class="header">
      <h1>${APP_NAME}</h1>
      <p>${APP_SUBTITLE}</p>
      <p>تاريخ الطباعة: ${new Date().toLocaleDateString("ar-EG", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
    </div>
    ${htmlContent}
  </body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 500);
}

export function exportFamilyReportPDF(
  family: LegacyGroup,
  members: LegacyMember[],
  submissions: SubmissionRecord[]
): void {
  if (typeof window === "undefined") return;
  const printWindow = window.open("", "_blank");
  if (!printWindow) return alert("يرجى السماح بفتح النوافذ المنبثقة للطباعة");

  const familyMembers = members.filter(m => m.groupId === family.id);
  const activeMembers = familyMembers.filter(m => m.active);
  const inactiveMembers = familyMembers.filter(m => !m.active);

  const getMemberMetrics = (mId: string) => {
    const mSubs = submissions.filter(s => (s.records || []).some(r => r.memberId === mId));
    const total = mSubs.length;
    const attended = mSubs.filter(s => {
      const rec = (s.records || []).find(r => r.memberId === mId);
      return rec && rec["حضور الخدمة"];
    }).length;
    const pct = total ? Math.round((attended / total) * 100) : 0;
    const lastSub = mSubs.filter(s => {
      const rec = (s.records || []).find(r => r.memberId === mId);
      return rec && rec["حضور الخدمة"];
    }).sort((a, b) => b.dateISO.localeCompare(a.dateISO))[0];

    return { total, attended, absent: total - attended, pct, lastDate: lastSub ? lastSub.date : "—" };
  };

  const html = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>تقرير أسرة - ${family.name}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
        body { font-family: 'Cairo', sans-serif; margin: 30px; color: #111827; background: #fff; line-height: 1.5; }
        .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2.5px solid #FB6C00; padding-bottom: 14px; margin-bottom: 24px; }
        .header h1 { margin: 0; font-size: 20px; color: #1E1B4B; }
        .header p { margin: 2px 0 0; font-size: 12px; color: #FB6C00; font-weight: 700; }
        .meta-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; margin-bottom: 24px; background: #FFF9F7; padding: 16px; border-radius: 12px; border: 1px solid #F2E8E4; }
        .meta-item { font-size: 13px; }
        .meta-item label { color: #6B7280; font-weight: 700; display: block; font-size: 11px; }
        .meta-item span { font-weight: 800; color: #111827; font-size: 14px; }
        .section-title { font-size: 15px; font-weight: 800; color: #1E1B4B; border-bottom: 2px solid #F2E8E4; padding-bottom: 6px; margin: 24px 0 12px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
        th { background: #FFF3E0; color: #E73F1E; text-align: right; padding: 10px; border: 1px solid #F2E8E4; font-weight: 800; }
        td { padding: 9px 10px; border: 1px solid #F2E8E4; text-align: right; }
        tr:nth-child(even) { background: #FFF9F7; }
        .badge { display: inline-block; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 800; background: #FFF3E0; color: #E73F1E; }
        .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #9CA3AF; border-top: 1px solid #F2E8E4; padding-top: 12px; }
        @media print { body { margin: 15mm; } button { display: none; } }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1>⛪ خدمة مارمينا - تقرير متابعة أسرة ${family.name}</h1>
          <p>تاريخ استخراج التقرير: ${new Date().toLocaleDateString('ar-EG')} - ${new Date().toLocaleTimeString('ar-EG')}</p>
        </div>
        <div style="text-align: left;">
          <span class="badge">${activeMembers.length} عضو مقيد</span>
        </div>
      </div>

      <div class="meta-grid">
        <div class="meta-item"><label>الخادم الرئيسي المسؤول</label><span>${family.mainServant || 'غير محدد'}</span></div>
        <div class="meta-item"><label>الخدام المعاونون</label><span>${(family.assistantServants || []).join('، ') || '—'}</span></div>
        <div class="meta-item"><label>وسيلة التواصل</label><span>${family.servantContact || '—'}</span></div>
      </div>

      <div class="section-title">👥 جدول أعضاء الأسرة وسجل الحضور (${activeMembers.length})</div>
      <table>
        <thead>
          <tr>
            <th>اسم العضو</th>
            <th>نسبة الحضور</th>
            <th>مرات الحضور</th>
            <th>مرات الغياب</th>
            <th>أحدث حضور</th>
            <th>هاتف العضو</th>
          </tr>
        </thead>
        <tbody>
          ${activeMembers.map(m => {
            const met = getMemberMetrics(m.id);
            return `
              <tr>
                <td><b>${m.name}</b></td>
                <td><b>${met.pct}%</b></td>
                <td>${met.attended} أسبوع</td>
                <td>${met.absent} أسبوع</td>
                <td>${met.lastDate}</td>
                <td>${m.phone || '—'}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>

      ${inactiveMembers.length ? `
        <div class="section-title">📦 الأعضاء المؤرشفون (${inactiveMembers.length})</div>
        <table>
          <thead>
            <tr>
              <th>اسم العضو</th>
              <th>تاريخ الأرشفة</th>
            </tr>
          </thead>
          <tbody>
            ${inactiveMembers.map(m => `
              <tr>
                <td>${m.name}</td>
                <td>${m.archivedAt ? new Date(m.archivedAt).toLocaleDateString('ar-EG') : '—'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}

      <div class="footer">
        تم استخراج هذا التقرير من نظام خدمة مارمينا الرسمي
      </div>

      <script>
        window.onload = function() { window.print(); };
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}

export function exportStatisticsPDF(
  scopeLabel: string,
  timePeriodLabel: string,
  totalMembers: number,
  totalWeeks: number,
  overallAttended: number,
  overallPct: number,
  familyStats: Array<{ name: string; count: number; pct: number }>
): void {
  if (typeof window === "undefined") return;
  const printWindow = window.open("", "_blank");
  if (!printWindow) return alert("يرجى السماح بفتح النوافذ المنبثقة للطباعة");

  const html = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>تقرير الإحصائيات التحليلي</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
        body { font-family: 'Cairo', sans-serif; margin: 30px; color: #111827; background: #fff; line-height: 1.5; }
        .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2.5px solid #E73F1E; padding-bottom: 14px; margin-bottom: 24px; }
        .header h1 { margin: 0; font-size: 20px; color: #1E1B4B; }
        .header p { margin: 2px 0 0; font-size: 12px; color: #E73F1E; font-weight: 700; }
        .filter-banner { background: #FFF3E0; border: 1px solid #FFE0B2; padding: 12px 16px; border-radius: 10px; margin-bottom: 20px; font-size: 13px; color: #E65100; font-weight: 800; display: flex; gap: 16px; }
        .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 24px; }
        .kpi-box { background: #FFF9F7; border: 1px solid #F2E8E4; border-top: 3.5px solid #E73F1E; border-radius: 10px; padding: 14px; text-align: center; }
        .kpi-box label { font-size: 11px; color: #6B7280; font-weight: 700; display: block; margin-bottom: 4px; }
        .kpi-box span { font-size: 24px; font-weight: 800; color: #E73F1E; }
        .section-title { font-size: 15px; font-weight: 800; color: #1E1B4B; border-bottom: 2px solid #F2E8E4; padding-bottom: 6px; margin: 24px 0 12px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
        th { background: #FFF3E0; color: #E73F1E; text-align: right; padding: 10px; border: 1px solid #F2E8E4; font-weight: 800; }
        td { padding: 9px 10px; border: 1px solid #F2E8E4; text-align: right; }
        tr:nth-child(even) { background: #FFF9F7; }
        .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #9CA3AF; border-top: 1px solid #F2E8E4; padding-top: 12px; }
        @media print { body { margin: 15mm; } button { display: none; } }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1>⛪ خدمة مارمينا - تقرير الإحصائيات الشامل والتحليلي</h1>
          <p>تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-EG')} - ${new Date().toLocaleTimeString('ar-EG')}</p>
        </div>
      </div>

      <div class="filter-banner">
        <span>🎯 نطاق العرض: ${scopeLabel}</span>
        <span>📅 الفترة الزمنية: ${timePeriodLabel}</span>
      </div>

      <div class="kpi-grid">
        <div class="kpi-box"><label>إجمالي الأعضاء المقيدين</label><span>${totalMembers}</span></div>
        <div class="kpi-box"><label>إجمالي الأسابيع المشمولة</label><span>${totalWeeks}</span></div>
        <div class="kpi-box"><label>متوسط نسبة الحضور العام</label><span>${overallPct}%</span></div>
        <div class="kpi-box"><label>نسبة الغياب العام</label><span>${100 - overallPct}%</span></div>
      </div>

      <div class="section-title">📊 تحليل ومقارنة أداء الأسر</div>
      <table>
        <thead>
          <tr>
            <th>اسم الأسرة</th>
            <th>عدد الأعضاء المقيدين</th>
            <th>متوسط نسبة الحضور العام</th>
          </tr>
        </thead>
        <tbody>
          ${familyStats.map(f => `
            <tr>
              <td><b>${f.name}</b></td>
              <td>${f.count} عضو</td>
              <td><b>${f.pct}%</b></td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="footer">
        تم استخراج هذا التقرير من نظام خدمة مارمينا الرسمي
      </div>

      <script>
        window.onload = function() { window.print(); };
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}

export function exportMemberProfilePDF(
  member: LegacyMember,
  group: LegacyGroup | undefined,
  attendanceHistory: any[],
  fieldStats: any[],
  notes: MemberNoteItem[]
): void {
  if (typeof window === "undefined") return;
  const printWindow = window.open("", "_blank");
  if (!printWindow) return alert("يرجى السماح بفتح النوافذ المنبثقة للطباعة");

  const totalWeeks = attendanceHistory.length;
  const attended = attendanceHistory.filter(r => r["حضور الخدمة"]).length;
  const attendPct = totalWeeks ? Math.round((attended / totalWeeks) * 100) : 0;

  const html = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>تقرير العضو - ${member.name}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
        body { font-family: 'Cairo', sans-serif; margin: 30px; color: #111827; background: #fff; line-height: 1.5; }
        .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2.5px solid #E73F1E; padding-bottom: 14px; margin-bottom: 24px; }
        .header h1 { margin: 0; font-size: 20px; color: #1E1B4B; }
        .header p { margin: 2px 0 0; font-size: 12px; color: #E73F1E; font-weight: 700; }
        .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 24px; background: #FFF9F7; padding: 16px; border-radius: 12px; border: 1px solid #F2E8E4; }
        .meta-item { font-size: 13px; }
        .meta-item label { color: #6B7280; font-weight: 700; display: block; font-size: 11px; }
        .meta-item span { font-weight: 800; color: #111827; font-size: 14px; }
        .section-title { font-size: 15px; font-weight: 800; color: #1E1B4B; border-bottom: 2px solid #F2E8E4; padding-bottom: 6px; margin: 24px 0 12px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
        th { background: #FFF3E0; color: #E73F1E; text-align: right; padding: 10px; border: 1px solid #F2E8E4; font-weight: 800; }
        td { padding: 9px 10px; border: 1px solid #F2E8E4; text-align: right; }
        tr:nth-child(even) { background: #FFF9F7; }
        .badge { display: inline-block; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 800; background: #FFF3E0; color: #E73F1E; }
        .note-card { background: #fff; border: 1px solid #F2E8E4; border-right: 4px solid #FB6C00; border-radius: 8px; padding: 12px 14px; margin-bottom: 10px; }
        .note-title { font-size: 14px; font-weight: 800; color: #1E1B4B; margin-bottom: 4px; }
        .note-meta { font-size: 11px; color: #6B7280; margin-bottom: 8px; }
        .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #9CA3AF; border-top: 1px solid #F2E8E4; padding-top: 12px; }
        @media print { body { margin: 15mm; } button { display: none; } }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1>⛪ خدمة مارمينا - تقرير العضو الشامل</h1>
          <p>تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')} - ${new Date().toLocaleTimeString('ar-EG')}</p>
        </div>
        <div style="text-align: left;">
          <span class="badge">نسبة الحضور: ${attendPct}%</span>
        </div>
      </div>

      <div class="meta-grid">
        <div class="meta-item"><label>اسم العضو الكامل</label><span>${member.name}</span></div>
        <div class="meta-item"><label>الأسرة المخصصة</label><span>${group?.name || 'غير محدد'}</span></div>
        <div class="meta-item"><label>رقم هاتف العضو</label><span>${member.phone || '—'}</span></div>
        <div class="meta-item"><label>رقم هاتف الأسرة</label><span>${member.familyPhone || '—'}</span></div>
        <div class="meta-item"><label>العنوان</label><span>${member.address || '—'}</span></div>
        <div class="meta-item"><label>المدرسة / الجامعة</label><span>${member.school || '—'}</span></div>
      </div>

      <div class="section-title">📊 إحصائيات الحضور والأنشطة (${totalWeeks} أسبوع)</div>
      <table>
        <thead>
          <tr>
            <th>مجال المتابعة</th>
            <th>مرات التحقق</th>
            <th>النسبة المئوية</th>
          </tr>
        </thead>
        <tbody>
          ${fieldStats.map(f => `
            <tr>
              <td>${f.icon} ${f.key}</td>
              <td>${f.count} من أصل ${totalWeeks}</td>
              <td><b>${f.pct}%</b></td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="section-title">📝 ملاحظات المتابعة والافتفاد (${notes.length})</div>
      ${notes.length ? notes.map(n => `
        <div class="note-card">
          <div class="note-title">${n.title} <span class="badge" style="float: left;">${n.category || 'General'}</span></div>
          <div class="note-meta">تاريخ الإنشاء: ${new Date(n.createdAt).toLocaleDateString('ar-EG')} | القائم بالتسجيل: ${n.createdBy || 'خادم'}</div>
          <div>${n.content}</div>
        </div>
      `).join('') : '<p style="color:#6B7280; font-size:12px;">لا توجد ملاحظات مسجلة لهذا العضو.</p>'}

      <div class="section-title">📅 سجل الحضور التفصيلي</div>
      <table>
        <thead>
          <tr>
            <th>التاريخ</th>
            <th>حضور الخدمة</th>
            <th>ملاحظات الحضور</th>
          </tr>
        </thead>
        <tbody>
          ${attendanceHistory.slice(0, 15).map(r => `
            <tr>
              <td>${r.date}</td>
              <td>${r["حضور الخدمة"] ? "✅ حاضر" : "❌ غائب"}</td>
              <td>${r.notes || "—"}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="footer">
        تم استخراج هذا التقرير من نظام خدمة مارمينا الرسمي
      </div>

      <script>
        window.onload = function() { window.print(); };
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
