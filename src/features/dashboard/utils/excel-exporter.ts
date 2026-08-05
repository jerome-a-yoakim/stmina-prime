import * as XLSX from "xlsx";
import { FIELDS } from "../styles/dashboard-theme";
import { LegacyGroup, LegacyMember, SubmissionRecord } from "../types/dashboard-types";

export function exportWeeklyExcel(
  sub: SubmissionRecord,
  groups: LegacyGroup[],
  members: LegacyMember[]
): void {
  const wb = XLSX.utils.book_new();
  groups.filter(g => g.active).forEach(g => {
    const gMembers = members.filter(m => m.groupId === g.id && m.active);
    const header: (string | number)[] = ["الأسم", ...FIELDS.map(f => f.key)];
    const rows: (string | number)[][] = [
      header,
      ...gMembers.map(m => {
        const rec = (sub.records || []).find(r => r.memberId === m.id) as Record<string, any> || {};
        return [m.name, ...FIELDS.map(f => (rec[f.key] ? "نعم" : "لا"))];
      })
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 32 }, ...Array(6).fill({ wch: 18 })];
    XLSX.utils.book_append_sheet(wb, ws, g.name.substring(0, 31));
  });
  XLSX.writeFile(wb, `weekly_${sub.dateISO}.xlsx`);
}

export function exportOverviewExcel(
  subs: SubmissionRecord[],
  groups: LegacyGroup[],
  members: LegacyMember[]
): void {
  const wb = XLSX.utils.book_new();
  const hdr: (string | number)[] = ["التاريخ", ...FIELDS.map(f => f.key)];
  groups.filter(g => g.active).forEach(g => {
    const rows: (string | number)[][] = [hdr];
    subs.forEach(sub => {
      const gm = members.filter(m => m.groupId === g.id && m.active);
      rows.push([
        sub.date,
        ...FIELDS.map(f => gm.filter(m => (sub.records || []).find(r => r.memberId === m.id && (r as Record<string, any>)[f.key])).length)
      ]);
    });
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, g.name.substring(0, 31));
  });
  const globalRows: (string | number)[][] = [hdr];
  subs.forEach(sub => {
    const active = members.filter(m => m.active);
    globalRows.push([
      sub.date,
      ...FIELDS.map(f => active.filter(m => (sub.records || []).find(r => r.memberId === m.id && (r as Record<string, any>)[f.key])).length)
    ]);
  });
  const wsG = XLSX.utils.aoa_to_sheet(globalRows);
  XLSX.utils.book_append_sheet(wb, wsG, "overview");
  XLSX.writeFile(wb, `overview_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
