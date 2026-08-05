"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { ReportingDataset } from "@/features/reports/types/reporting";
import {
  buildWeeklyIndicatorTrends,
  type ReportFilters,
  type WeeklyIndicatorKey,
} from "@/features/reports/lib/report-builders";
import styles from "./reporting-trends.module.css";

const METRICS: Array<{ key: WeeklyIndicatorKey; label: string; color: string }> = [
  { key: "serviceAttendance", label: "حضور الخدمة", color: "var(--primary)" },
  { key: "liturgyAttendance", label: "حضور القداس", color: "var(--accent)" },
  { key: "liturgyService", label: "خدمة القداس", color: "var(--info)" },
  { key: "confession", label: "الاعتراف", color: "var(--success)" },
  { key: "phoneVisitation", label: "الافتقاد التليفوني", color: "var(--warning)" },
  { key: "homeVisitation", label: "الافتقاد المنزلي", color: "var(--danger)" },
];

const chartMargin = { top: 8, right: 4, left: -12, bottom: 8 };
const tooltipStyle = {
  border: "1px solid var(--border)", borderRadius: 14, background: "var(--card)",
  boxShadow: "var(--shadow-floating)", color: "var(--text-primary)", fontSize: 11,
};
const formatPercent = (value: unknown) => `${new Intl.NumberFormat("ar-EG").format(Number(value) || 0)}٪`;

export function ReportingTrends({ data, filters }: { data: ReportingDataset; filters: ReportFilters }) {
  const points = useMemo(() => buildWeeklyIndicatorTrends(data, filters), [data, filters]);
  const [visible, setVisible] = useState<Record<WeeklyIndicatorKey, boolean>>(() => Object.fromEntries(
    METRICS.map((metric) => [metric.key, true]),
  ) as Record<WeeklyIndicatorKey, boolean>);
  const hasRecordedData = points.some((point) => point.recorded > 0);
  const toggle = (key: WeeklyIndicatorKey) => setVisible((current) => ({ ...current, [key]: !current[key] }));

  return <section className={styles.dashboard} aria-labelledby="trends-title">
    <div className={styles.heading}><div><span>لوحة الاتجاهات</span><h3 id="trends-title">تطور المؤشرات الأسبوعية</h3><p>النسب المئوية حسب نطاق التقرير والفلاتر المحددة حاليًا.</p></div><small>{new Intl.NumberFormat("ar-EG").format(points.length)} أسابيع</small></div>
    {!points.length || !hasRecordedData ? <div className={styles.empty}><span>⌁</span><h4>لا توجد بيانات اتجاه مطابقة</h4><p>عدّل الفترة أو الأسرة أو المخدوم لعرض التطور الأسبوعي.</p></div> : <>
      <div className={styles.seriesControls} aria-label="إظهار أو إخفاء المؤشرات">
        {METRICS.map((metric) => <button type="button" key={metric.key} aria-pressed={visible[metric.key]} className={visible[metric.key] ? styles.active : ""} onClick={() => toggle(metric.key)}>
          <i style={{ background: metric.color }} aria-hidden="true" />{metric.label}
        </button>)}
      </div>
      <div className={styles.overallChart} aria-label="مقارنة اتجاهات المؤشرات الستة">
        <ResponsiveContainer width="100%" height={340}>
          <LineChart data={points} margin={chartMargin}>
            <CartesianGrid stroke="var(--divider)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "var(--text-secondary)", fontSize: 10 }} tickLine={false} axisLine={{ stroke: "var(--border)" }} minTickGap={24} />
            <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}٪`} tick={{ fill: "var(--text-secondary)", fontSize: 10 }} tickLine={false} axisLine={false} width={42} />
            <Tooltip formatter={(value, name) => [formatPercent(value), String(name)]} labelStyle={{ color: "var(--text-primary)", marginBottom: 6 }} contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ paddingTop: 16, fontSize: 11 }} />
            {METRICS.map((metric) => visible[metric.key] && <Line key={metric.key} type="monotone" dataKey={metric.key} name={metric.label} stroke={metric.color} strokeWidth={2.4} dot={{ r: 3, fill: metric.color, strokeWidth: 0 }} activeDot={{ r: 5 }} connectNulls />)}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <details className={styles.details}>
        <summary><span><strong>تحليل كل مؤشر</strong><small>افتح الرسوم المنفصلة لمراجعة كل اتجاه بوضوح.</small></span><i aria-hidden="true">⌄</i></summary>
        <div className={styles.individualGrid}>{METRICS.map((metric) => <article key={metric.key}>
          <header><i style={{ background: metric.color }} aria-hidden="true" /><h4>{metric.label}</h4><span>٪</span></header>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={points} margin={chartMargin}>
              <CartesianGrid stroke="var(--divider)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "var(--text-muted)", fontSize: 9 }} tickLine={false} axisLine={{ stroke: "var(--border)" }} minTickGap={32} />
              <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}٪`} tick={{ fill: "var(--text-muted)", fontSize: 9 }} tickLine={false} axisLine={false} width={38} />
              <Tooltip formatter={(value) => [formatPercent(value), metric.label]} contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey={metric.key} name={metric.label} stroke={metric.color} strokeWidth={2.5} dot={{ r: 3, fill: metric.color, strokeWidth: 0 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </article>)}</div>
      </details>
    </>}
  </section>;
}
