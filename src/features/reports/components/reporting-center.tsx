"use client";

import { useMemo, useState } from "react";
import type { ReportingDataset } from "@/features/reports/types/reporting";
import {
  buildReport, filterDescription, REPORTS,
  type ReportFilters, type ReportId, type ReportView,
} from "@/features/reports/lib/report-builders";
import {
  downloadExcelReport, EMPTY_EXPORT_MESSAGE, openPrintReport,
} from "@/features/reports/lib/report-export";
import { ReportingTrends } from "@/features/reports/components/reporting-trends";
import styles from "./reporting-center.module.css";

function initialFilters(data: ReportingDataset): ReportFilters {
  const latestDate = data.sessions.at(-1)?.date || "";
  return {
    from: data.defaultPeriod?.from || latestDate,
    to: data.defaultPeriod?.to || latestDate,
    groupId: "", memberId: "", memberStatus: "active", search: "",
  };
}


interface FilterConfig {
  dates?: boolean;
  family?: boolean;
  member?: boolean;
  status?: boolean;
  search?: boolean;
  forcedActive?: boolean;
  visitationDateNote?: boolean;
}

const FILTERS: Record<Exclude<ReportId, "overview">, FilterConfig> = {
  weekly: { dates: true, family: true, member: true, status: true, search: true },
  "date-summary": { dates: true, family: true, member: true, status: true },
  "family-attendance": { dates: true, family: true, status: true },
  "member-attendance": { dates: true, family: true, member: true, status: true, search: true },
  absence: { dates: true, family: true, member: true, search: true, forcedActive: true },
  visitation: { dates: true, family: true, member: true, search: true, forcedActive: true, visitationDateNote: true },
  directory: { family: true, member: true, status: true, search: true },
  "member-export": { family: true, member: true, status: true, search: true },
};

const PICKER_GROUPS: Array<{ id: string; title: string; reportIds: Array<Exclude<ReportId, "overview">>; open?: boolean }> = [
  { id: "everyday", title: "الحضور — يوميًا", reportIds: ["weekly", "date-summary", "absence"], open: true },
  { id: "comparative", title: "الحضور — مقارنات", reportIds: ["family-attendance", "member-attendance"] },
  { id: "visitation", title: "الافتقاد", reportIds: ["visitation"] },
  { id: "members", title: "بيانات المخدومين", reportIds: ["directory", "member-export"] },
];

function scopedFilters(filters: ReportFilters, config: FilterConfig): ReportFilters {
  return {
    from: config.dates ? filters.from : "",
    to: config.dates ? filters.to : "",
    groupId: config.family ? filters.groupId : "",
    memberId: config.member ? filters.memberId : "",
    memberStatus: config.forcedActive ? "active" : config.status ? filters.memberStatus : "all",
    search: config.search ? filters.search : "",
  };
}

function statusTone(reportId: ReportId, key: string, value: string) {
  if (key === "priority") {
    if (value === "عاجل") return "danger";
    if (value === "حرج") return "warning";
    if (value === "مهم") return "info";
  }
  if (reportId === "visitation" && key === "covered") return value === "تم" ? "success" : "danger";
  return null;
}

export function ReportingCenter({ initialData, initialReportId = null, initialGroupId = "" }: {
  initialData: ReportingDataset;
  initialReportId?: Exclude<ReportId, "overview"> | null;
  initialGroupId?: string;
}) {
  const defaults = useMemo(() => ({ ...initialFilters(initialData), groupId: initialGroupId }), [initialData, initialGroupId]);
  const [selectedId, setSelectedId] = useState<Exclude<ReportId, "overview"> | null>(initialReportId);
  const [filters, setFilters] = useState<ReportFilters>(defaults);
  const [exporting, setExporting] = useState<"excel" | "pdf" | null>(null);
  const [exportError, setExportError] = useState("");
  const [exportNotice, setExportNotice] = useState("");

  const overview = useMemo(() => buildReport("overview", initialData, defaults), [initialData, defaults]);
  const absenceOverview = useMemo(() => buildReport("absence", initialData, defaults), [initialData, defaults]);
  const visitationOverview = useMemo(() => buildReport("visitation", initialData, defaults), [initialData, defaults]);
  const config = selectedId ? FILTERS[selectedId] : null;
  const effectiveFilters = useMemo(() => config ? scopedFilters(filters, config) : defaults, [config, defaults, filters]);
  const report = useMemo(() => selectedId ? buildReport(selectedId, initialData, effectiveFilters) : null, [selectedId, initialData, effectiveFilters]);
  const metadata = useMemo(() => {
    if (!report || !config) return [];
    const items = filterDescription(initialData, effectiveFilters);
    const visibleItems = [
      ...(config.dates ? [items[0]] : []),
      ...(config.family ? [items[1]] : []),
      ...(config.member ? [items[2]] : []),
      ...(config.status || config.forcedActive ? [items[3]] : []),
    ];
    if (effectiveFilters.search.trim()) visibleItems.push(`البحث: ${effectiveFilters.search.trim()}`);
    return visibleItems;
  }, [config, effectiveFilters, initialData, report]);
  const membersForSelect = initialData.members.filter((member) => !filters.groupId || member.groupId === filters.groupId);

  const update = <K extends keyof ReportFilters>(key: K, value: ReportFilters[K]) => {
    setFilters((current) => ({ ...current, [key]: value, ...(key === "groupId" ? { memberId: "" } : {}) }));
  };

  const selectReport = (id: Exclude<ReportId, "overview">, resetToDefaults = false) => {
    if (resetToDefaults) setFilters(defaults);
    setSelectedId(id);
    setExportError("");
    setExportNotice("");
    window.requestAnimationFrame(() => document.getElementById("report-workspace")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const resetVisibleFilters = () => {
    if (!config) return;
    setFilters((current) => ({
      ...current,
      ...(config.dates ? { from: defaults.from, to: defaults.to } : {}),
      ...(config.family ? { groupId: "" } : {}),
      ...(config.member ? { memberId: "" } : {}),
      ...(config.status ? { memberStatus: "active" as const } : {}),
      ...(config.search ? { search: "" } : {}),
    }));
  };

  const runExport = async (kind: "excel" | "pdf") => {
    if (!report) return;
    setExportError(""); setExportNotice(""); setExporting(kind);
    try {
      if (kind === "excel") await downloadExcelReport(report, metadata);
      else openPrintReport(report, metadata);
      if (!report.rows.length) setExportNotice(EMPTY_EXPORT_MESSAGE);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "تعذر تصدير التقرير.");
    } finally { setExporting(null); }
  };

  const orientationCards = [
    { id: "date-summary" as const, label: "نسبة الحضور", value: overview.kpis[2]?.value || "٠٪", hint: "أحدث أسبوع حضور مسجل", icon: "⌁" },
    { id: "absence" as const, label: "الغياب المتتالي", value: absenceOverview.kpis[0]?.value || "٠", hint: "يحتاجون متابعة", icon: "!" },
    { id: "visitation" as const, label: "تغطية الافتقاد", value: visitationOverview.kpis[2]?.value || "٠٪", hint: "من المتغيبين", icon: "☎" },
    { id: "family-attendance" as const, label: "الأسر المتاحة", value: new Intl.NumberFormat("ar-EG").format(initialData.groups.length), hint: "ضمن صلاحياتك", icon: "⌂" },
  ];

  return <main className={styles.center} dir="rtl">
    <header className={styles.pageHeader}>
      <div><span className={styles.eyebrow}>مركز التقارير</span><h1>تقارير الخدمة</h1></div>
      <p>تقارير عملية للحضور والافتقاد وبيانات المخدومين، ضمن نطاق صلاحياتك.</p>
    </header>

    <section className={styles.orientation} aria-labelledby="orientation-title">
      <div className={styles.sectionHeading}><div><h2 id="orientation-title">نظرة سريعة</h2><p>أهم مؤشرات أحدث أسبوع حضور مسجل.</p></div><span>أحدث أسبوع مسجل</span></div>
      <div className={styles.orientationGrid}>{orientationCards.map((card) => <button type="button" key={card.id} className={styles.orientationCard} onClick={() => selectReport(card.id, true)}>
        <span className={styles.orientationIcon}>{card.icon}</span><span className={styles.orientationCopy}><small>{card.label}</small><strong>{card.value}</strong><em>{card.hint}</em></span><b aria-hidden="true">التفاصيل ←</b>
      </button>)}</div>
    </section>

    <section className={styles.picker} aria-labelledby="picker-title">
      <div className={styles.sectionHeading}><div><h2 id="picker-title">اختر تقريرًا</h2><p>ابدأ بالتقارير اليومية أو افتح مجموعة أخرى عند الحاجة.</p></div>
        {selectedId && <span className={styles.currentSelection}>المحدد: {REPORTS.find((item) => item.id === selectedId)?.title}</span>}</div>
      <div className={styles.pickerGroups}>{PICKER_GROUPS.map((group) => <details key={group.id} className={styles.pickerGroup} open={group.open}>
        <summary><span>{group.title}</span><small>{new Intl.NumberFormat("ar-EG").format(group.reportIds.length)} تقارير</small><i aria-hidden="true">⌄</i></summary>
        <div className={styles.reportCards}>{group.reportIds.map((id) => {
          const item = REPORTS.find((candidate) => candidate.id === id)!;
          return <button type="button" key={id} className={`${styles.reportCard} ${selectedId === id ? styles.selected : ""}`} onClick={() => selectReport(id)} aria-pressed={selectedId === id}>
            <span className={styles.reportIcon}>{item.icon}</span><span><strong>{item.title}</strong><small>{item.description}</small></span><b aria-hidden="true">←</b>
          </button>;
        })}</div>
      </details>)}</div>
    </section>

    {report && config && <section className={styles.workspace} id="report-workspace" aria-live="polite">
      <div className={styles.reportHeader}><div><span className={styles.eyebrow}>التقرير الحالي</span><h2>{report.title}</h2><p>{report.description}</p></div>
        {initialData.canExport ? <div className={styles.exportArea}><div className={styles.exportActions}>
          <button type="button" onClick={() => runExport("excel")} disabled={Boolean(exporting)}>{exporting === "excel" ? "جارٍ التجهيز…" : "تصدير Excel"}</button>
          <button type="button" className={styles.pdfButton} onClick={() => runExport("pdf")} disabled={Boolean(exporting)}>{exporting === "pdf" ? "جارٍ التجهيز…" : "طباعة / حفظ PDF"}</button>
        </div><small>سيتم فتح نافذة طباعة يمكنك من خلالها الحفظ كملف PDF.</small></div> : <p className={styles.permissionNote}>لديك صلاحية العرض فقط.</p>}
      </div>
      {exportError && <p className={styles.error} role="alert">{exportError}</p>}
      {exportNotice && <p className={styles.exportNotice} role="status">{exportNotice}</p>}

      <section className={styles.filters} aria-label="فلاتر التقرير">
        <div className={styles.filterHeading}><div><h3>تصفية التقرير</h3><p>تظهر فقط الخيارات المؤثرة في هذا التقرير.</p></div>
          <button type="button" className={styles.reset} onClick={resetVisibleFilters}>إعادة الضبط</button></div>
        <div className={styles.filterGrid}>
          {config.dates && <><label>من تاريخ<input type="date" value={filters.from} max={filters.to || undefined} onChange={(event) => update("from", event.target.value)} /></label>
            <label>إلى تاريخ<input type="date" value={filters.to} min={filters.from || undefined} onChange={(event) => update("to", event.target.value)} /></label></>}
          {config.family && <label>الأسرة<select value={filters.groupId} onChange={(event) => update("groupId", event.target.value)}><option value="">كل الأسر</option>
            {initialData.groups.map((group) => <option key={group.id} value={group.id}>{group.name}{group.grade ? ` — ${group.grade}` : ""}</option>)}</select></label>}
          {config.member && <label>المخدوم<select value={filters.memberId} onChange={(event) => update("memberId", event.target.value)}><option value="">كل المخدومين</option>
            {membersForSelect.map((member) => <option key={member.id} value={member.id}>{member.fullName}</option>)}</select></label>}
          {config.status && <label>حالة العضوية<select value={filters.memberStatus} onChange={(event) => update("memberStatus", event.target.value as ReportFilters["memberStatus"])}>
            <option value="active">النشطون</option><option value="archived">المؤرشفون</option><option value="all">كل الحالات</option></select></label>}
          {config.search && <label>بحث<input type="search" value={filters.search} placeholder="اسم، هاتف، عنوان…" onChange={(event) => update("search", event.target.value)} /></label>}
          {config.forcedActive && <div className={styles.staticFilter}><span>حالة العضوية</span><strong>النشطون فقط</strong><small>تلقائي لهذا التقرير</small></div>}
        </div>
        {config.visitationDateNote && <p className={styles.filterNote}>ⓘ تاريخ البداية يحدد فترة الافتقاد المسجل فقط؛ سجل الغياب يُحسب حتى تاريخ النهاية.</p>}
      </section>

      <div className={styles.kpis}>{report.kpis.map((kpi) => <article key={kpi.label}><span>{kpi.label}</span><strong>{kpi.value}</strong>{kpi.hint && <small>{kpi.hint}</small>}</article>)}</div>

      <ReportingTrends data={initialData} filters={effectiveFilters} />

      {report.visual?.length ? <div className={styles.visual}><div className={styles.contentHeading}><div><h3>آخر ١٠ اجتماعات</h3><p>نسبة الحضور في كل اجتماع.</p></div></div>{report.visual.map((item) => <div className={styles.barRow} key={item.label}>
        <span title={item.label}>{item.label}</span><div><i style={{ width: `${Math.max(0, Math.min(100, item.value))}%` }} /></div><strong>{item.display}</strong></div>)}</div> : null}

      {selectedId !== "directory" && selectedId !== "member-export" && initialData.limitations.length > 0 && <details className={styles.accuracy}><summary>ⓘ ملاحظات حول الدقة <i aria-hidden="true">⌄</i></summary><ul>{initialData.limitations.map((note) => <li key={note}>{note}</li>)}</ul></details>}

      {selectedId === "absence" && <div className={styles.followUpHeading}><div><h3>قائمة المتابعة</h3><p>{new Intl.NumberFormat("ar-EG").format(report.rows.length)} مخدومين يحتاجون متابعة</p></div>
        <button type="button" onClick={() => selectReport("visitation")}>عرض تغطية الافتقاد لهؤلاء المخدومين ←</button></div>}

      {selectedId === "date-summary" ? <details className={styles.tableDisclosure}><summary>عرض الجدول التفصيلي <span>{new Intl.NumberFormat("ar-EG").format(report.rows.length)} صف</span><i aria-hidden="true">⌄</i></summary>
        <ReportTable report={report} />
      </details> : <><div className={styles.tableHeading}><div><h3>{selectedId === "absence" ? "التفاصيل" : "البيانات التفصيلية"}</h3><p>{new Intl.NumberFormat("ar-EG").format(report.rows.length)} صف</p></div></div><ReportTable report={report} /></>}
    </section>}
  </main>;
}

function ReportTable({ report }: { report: ReportView }) {
  return <div className={styles.tableWrap}>{report.rows.length ? <table><thead><tr>{report.columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead>
    <tbody>{report.rows.map((row, rowIndex) => <tr key={rowIndex}>{report.columns.map((column) => {
      const value = String(row[column.key] ?? "");
      const tone = statusTone(report.id, column.key, value);
      return <td key={column.key}>{tone ? <span className={`${styles.statusText} ${styles[tone]}`}><i aria-hidden="true" />{value}</span> : value}</td>;
    })}</tr>)}</tbody></table>
    : <div className={styles.empty}><span>⌕</span><h3>لا توجد بيانات مطابقة</h3><p>جرّب تعديل خيارات التصفية المتاحة لهذا التقرير.</p></div>}</div>;
}
