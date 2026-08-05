import * as XLSX from "xlsx";
import { FIELDS } from "@/features/dashboard/styles/dashboard-theme";
import { LegacyGroup, LegacyMember, SubmissionRecord } from "@/features/dashboard/types/dashboard-types";

export function exportWeeklyExcel(sub: SubmissionRecord, groups: LegacyGroup[], members: LegacyMember[]) {
  const wb = XLSX.utils.book_new();

  groups.filter(g => g.active).forEach(g => {
    const gm = members.filter(m => m.groupId === g.id && m.active);
    const rows: (string | number)[][] = [
      ["#", "الاسم", ...FIELDS.map(f => f.key)],
      ...gm.map((m, i) => {
        const rec = ((sub.records || []) as Record<string, any>[]).find(r => r.memberId === m.id) || {};
        return [i + 1, m.name, ...FIELDS.map(f => (rec[f.key] ? "✓" : ""))] as (string | number)[];
      }),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 4 }, { wch: 25 }, ...FIELDS.map(() => ({ wch: 12 }))];
    XLSX.utils.book_append_sheet(wb, ws, g.name.replace(/[\\/*?:[\]]/g, "").slice(0, 31));
  });

  XLSX.writeFile(wb, `حضور_${sub.dateISO}.xlsx`);
}

export function exportOverviewExcel(subs: SubmissionRecord[], groups: LegacyGroup[], members: LegacyMember[]) {
  const wb = XLSX.utils.book_new();

  groups.filter(g => g.active).forEach(g => {
    const gm = members.filter(m => m.groupId === g.id && m.active);
    const sortedSubs = [...subs].sort((a, b) => a.dateISO.localeCompare(b.dateISO));
    const dates = sortedSubs.map(s => s.date);

    const rows: (string | number)[][] = [
      ["#", "الاسم", ...dates, "إجمالي الحضور", "نسبة الحضور"],
      ...gm.map((m, i) => {
        let attCount = 0;
        const atts = sortedSubs.map(s => {
          const rec = ((s.records || []) as Record<string, any>[]).find(r => r.memberId === m.id);
          const ok = rec && rec["حضور الخدمة"];
          if (ok) attCount++;
          return ok ? "✓" : "";
        });
        const pct = sortedSubs.length ? `${Math.round((attCount / sortedSubs.length) * 100)}%` : "0%";
        return [i + 1, m.name, ...atts, attCount, pct] as (string | number)[];
      }),
    ];

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 4 }, { wch: 25 }, ...dates.map(() => ({ wch: 12 })), { wch: 14 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws, g.name.replace(/[\\/*?:[\]]/g, "").slice(0, 31));
  });

  XLSX.writeFile(wb, `تقرير_شامل_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
