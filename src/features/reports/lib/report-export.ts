import type { ReportView } from "@/features/reports/lib/report-builders";

type XlsxModule = typeof import("xlsx");

export const SERVICE_NAME = "خدمة مارمينا";
export const SERVICE_SUBTITLE = "إدارة الخدمة";
export const EMPTY_EXPORT_MESSAGE = "لا توجد بيانات مطابقة للفلاتر الحالية. تم إنشاء التقرير بالملخص دون صفوف بيانات.";

const excelMime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>'"]/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
}[character] || character));

export const safeFileName = (value: string) => value.replace(/[\\/:*?"<>|]/g, "-").trim();

export function generatedLabel(date = new Date()) {
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "full", timeStyle: "short", timeZone: "Africa/Cairo",
  }).format(date);
}

export function buildExcelWorkbook(XLSX: XlsxModule, view: ReportView, metadata: string[], generatedAt = new Date()) {
  const generated = generatedLabel(generatedAt);
  const summary = [
    [SERVICE_NAME], [SERVICE_SUBTITLE], [], [view.title], [view.description],
    [`تاريخ ووقت الإنشاء: ${generated}`], [], ["الفلاتر المطبقة"],
    ...(metadata.length ? metadata.map((line) => [line]) : [["لا توجد فلاتر مطبقة"]]),
    [], ["ملخص المؤشرات"], ["المؤشر", "القيمة", "ملاحظة"],
    ...view.kpis.map((kpi) => [kpi.label, kpi.value, kpi.hint || ""]),
  ];
  const workbook = XLSX.utils.book_new();
  workbook.Workbook = { Views: [{ RTL: true }] };
  const summarySheet = XLSX.utils.aoa_to_sheet(summary);
  summarySheet["!cols"] = [{ wch: 38 }, { wch: 24 }, { wch: 40 }];
  summarySheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 2 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 2 } },
  ];
  XLSX.utils.book_append_sheet(workbook, summarySheet, "ملخص التقرير");

  if (view.columns.length) {
    const headings = view.columns.map((column) => column.label);
    const dataRows = view.rows.length
      ? view.rows.map((row) => view.columns.map((column) => row[column.key]))
      : [["لا توجد بيانات مطابقة للفلاتر الحالية", ...view.columns.slice(1).map(() => "")]];
    const dataSheet = XLSX.utils.aoa_to_sheet([headings, ...dataRows]);
    dataSheet["!cols"] = view.columns.map((column, index) => {
      const values = view.rows.slice(0, 100).map((row) => String(row[column.key] ?? "").length);
      return { wch: Math.min(42, Math.max(14, column.label.length + 4, ...values.map((length) => length + 2))) };
    });
    dataSheet["!autofilter"] = { ref: `A1:${XLSX.utils.encode_col(Math.max(0, view.columns.length - 1))}1` };
    if (!view.rows.length && view.columns.length > 1) {
      dataSheet["!merges"] = [{ s: { r: 1, c: 0 }, e: { r: 1, c: view.columns.length - 1 } }];
    }
    XLSX.utils.book_append_sheet(workbook, dataSheet, "البيانات");
  }

  return {
    workbook,
    fileName: `${safeFileName(view.title)}-${generatedAt.toISOString().slice(0, 10)}.xlsx`,
  };
}

export async function downloadExcelReport(view: ReportView, metadata: string[]) {
  const XLSX = await import("xlsx");
  const { workbook, fileName } = buildExcelWorkbook(XLSX, view, metadata);
  const bytes = XLSX.write(workbook, { bookType: "xlsx", type: "array", compression: true });
  const blob = new Blob([bytes], { type: excelMime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function paginateRows<T>(rows: T[], firstPageSize: number, nextPageSize: number): T[][] {
  if (!rows.length) return [[]];
  const pages: T[][] = [rows.slice(0, firstPageSize)];
  for (let index = firstPageSize; index < rows.length; index += nextPageSize) {
    pages.push(rows.slice(index, index + nextPageSize));
  }
  return pages;
}

export function buildPrintHtml(view: ReportView, metadata: string[], generatedAt = new Date()) {
  const generated = generatedLabel(generatedAt);
  const landscape = view.columns.length > 7;
  // The first page also contains filters and KPI cards, so it deliberately
  // carries fewer rows than continuation pages to avoid browser repagination.
  const rowPages = paginateRows(view.rows, landscape ? 7 : 10, landscape ? 16 : 22);
  const totalPages = rowPages.length;
  const headings = view.columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("");
  const filters = metadata.length
    ? metadata.map((line) => `<li>${escapeHtml(line)}</li>`).join("")
    : "<li>لا توجد فلاتر مطبقة</li>";
  const kpis = view.kpis.map((kpi) => `<article><span>${escapeHtml(kpi.label)}</span><strong>${escapeHtml(kpi.value)}</strong>${kpi.hint ? `<small>${escapeHtml(kpi.hint)}</small>` : ""}</article>`).join("");

  const pages = rowPages.map((pageRows, pageIndex) => {
    const bodyRows = pageRows.map((row) => `<tr>${view.columns.map((column) => `<td>${escapeHtml(row[column.key])}</td>`).join("")}</tr>`).join("");
    const table = view.columns.length ? `<section class="data-section"><h2>البيانات التفصيلية</h2><table><thead><tr>${headings}</tr></thead><tbody>${bodyRows || `<tr><td class="empty" colspan="${view.columns.length}">لا توجد بيانات مطابقة للفلاتر الحالية</td></tr>`}</tbody></table></section>` : `<div class="empty-card">لا توجد بيانات تفصيلية لهذا التقرير.</div>`;
    return `<section class="report-page">
      <header class="document-header ${pageIndex ? "compact" : ""}">
        <div class="service-mark"><span>خ</span><div><h1>${SERVICE_NAME}</h1><p>${SERVICE_SUBTITLE}</p></div></div>
        <div class="report-identity"><p>تقرير رسمي</p><h2>${escapeHtml(view.title)}</h2></div>
      </header>
      ${pageIndex === 0 ? `<section class="report-intro"><p>${escapeHtml(view.description)}</p><div class="generated"><span>تاريخ ووقت الإنشاء</span><strong>${escapeHtml(generated)}</strong></div></section>
      <section class="filters"><h2>الفلاتر المطبقة</h2><ul>${filters}</ul></section>
      <section class="summary"><h2>ملخص التقرير</h2><div class="kpis">${kpis}</div></section>` : ""}
      ${table}
      <footer><span>تم إنشاء التقرير في ${escapeHtml(generated)}</span><strong>صفحة ${new Intl.NumberFormat("ar-EG").format(pageIndex + 1)} من ${new Intl.NumberFormat("ar-EG").format(totalPages)}</strong></footer>
    </section>`;
  }).join("");

  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(view.title)}</title>
  <style>
    @page{size:A4 ${landscape ? "landscape" : "portrait"};margin:0}
    *{box-sizing:border-box}html,body{margin:0;padding:0;background:#ece8e1;color:#2a2420;font-family:Tahoma,Arial,sans-serif;direction:rtl}
    .report-page{display:flex;flex-direction:column;width:${landscape ? "297mm" : "210mm"};min-height:${landscape ? "210mm" : "297mm"};margin:0 auto 8mm;padding:12mm 13mm 10mm;background:#fff;page-break-after:always;break-after:page}
    .report-page:last-child{page-break-after:auto;break-after:auto}.document-header{display:flex;align-items:center;justify-content:space-between;gap:12mm;padding-bottom:5mm;border-bottom:2px solid #8b1538}.document-header.compact{padding-bottom:3mm}
    .service-mark{display:flex;align-items:center;gap:4mm}.service-mark>span{display:grid;width:13mm;height:13mm;place-items:center;border-radius:50%;background:#8b1538;color:#fff;font-size:18pt;font-weight:bold}.service-mark h1{margin:0;color:#8b1538;font-size:20pt}.service-mark p{margin:1mm 0 0;color:#6b5f55;font-size:9pt}
    .report-identity{text-align:left}.report-identity p{margin:0;color:#c9a646;font-size:8pt;font-weight:bold}.report-identity h2{margin:1mm 0 0;font-size:13pt}.report-intro{display:flex;align-items:flex-start;justify-content:space-between;gap:8mm;padding:5mm 0}.report-intro>p{max-width:65%;margin:0;color:#6b5f55;font-size:9pt;line-height:1.7}.generated{display:grid;gap:1mm;text-align:left}.generated span{color:#9a8f84;font-size:7.5pt}.generated strong{font-size:8.5pt}
    h2{margin:0 0 2.5mm;font-size:10pt}.filters,.summary{margin-bottom:4mm}.filters ul{display:flex;flex-wrap:wrap;gap:2mm;margin:0;padding:0;list-style:none}.filters li{padding:1.5mm 2.5mm;border:1px solid #eae4d9;border-radius:3mm;background:#f3efe8;color:#5c2a3a;font-size:7.5pt}
    .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:2.5mm}.kpis article{min-height:20mm;padding:3mm;border:1px solid #eae4d9;border-radius:3mm;background:#fafaf7}.kpis span,.kpis small{display:block;color:#6b5f55;font-size:7.5pt}.kpis strong{display:block;margin:1mm 0;color:#2a2420;font-size:16pt}
    .data-section{margin-top:2mm}.data-section>h2{color:#5c2a3a}table{width:100%;border-collapse:collapse;table-layout:auto;font-size:${landscape ? "6.5pt" : "7.5pt"};unicode-bidi:plaintext}thead{display:table-header-group}tr{break-inside:avoid}th,td{padding:${landscape ? "1.5mm" : "1.8mm"};border:1px solid #e2dbcf;text-align:right;vertical-align:top;line-height:1.45;overflow-wrap:anywhere}th{background:#5c2a3a;color:#fff;font-weight:bold}tbody tr:nth-child(even){background:#fafaf7}.empty{padding:10mm;text-align:center;color:#6b5f55}.empty-card{margin-top:6mm;padding:12mm;border:1px dashed #cfc5b6;border-radius:4mm;background:#fafaf7;color:#6b5f55;text-align:center}
    footer{display:flex;align-items:center;justify-content:space-between;gap:6mm;margin-top:auto;padding-top:4mm;border-top:1px solid #eae4d9;color:#9a8f84;font-size:7pt}footer strong{color:#5c2a3a}
    @media print{html,body{background:#fff}.report-page{margin:0;box-shadow:none}}
    @media screen{.report-page{box-shadow:0 8px 30px rgba(42,36,32,.12)}}
  </style></head><body>${pages}</body></html>`;
}

export function openPrintReport(view: ReportView, metadata: string[]) {
  // Capture a real window reference first. `noopener` in window features can
  // deliberately return null in modern browsers even when the popup opens.
  const popup = window.open("", "_blank");
  if (!popup) throw new Error("تعذر فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة ثم حاول مجددًا.");
  try { popup.opener = null; } catch { /* Some browsers expose opener as read-only. */ }
  popup.document.open();
  popup.document.write(buildPrintHtml(view, metadata));
  popup.document.close();
  popup.focus();
  window.setTimeout(() => {
    if (!popup.closed) popup.print();
  }, 350);
}
