import React, { useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { FIELDS } from "../styles/dashboard-theme";
import { LegacyGroup, LegacyMember, SubmissionRecord } from "../types/dashboard-types";
import { ProgBar } from "../ui/progress-bar";
import { exportPDF } from "../utils/pdf-exporter";

interface DashboardPageProps {
  submissions: SubmissionRecord[];
  groups: LegacyGroup[];
  members: LegacyMember[];
}

export function DashboardPage({ submissions, groups, members }: DashboardPageProps) {
  const [groupFilter, setGroupFilter] = useState<string>("all");

  const exportDashPDF = () => {
    const latest = submissions[submissions.length - 1];
    if (!latest) return;
    const recs = (latest.records || []) as Record<string, any>[];
    const rows = FIELDS.map(
      f =>
        `<tr><td>${f.icon} ${f.key}</td><td>${
          recs.filter(r => r[f.key]).length
        }</td><td>${
          members.filter(m => m.active).length
            ? Math.round(
                (recs.filter(r => r[f.key]).length / members.filter(m => m.active).length) * 100
              )
            : 0
        }%</td></tr>`
    ).join("");
    const html = `<h2>لوحة الإحصائيات - آخر أسبوع: ${latest.date}</h2><table><thead><tr><th>المؤشر</th><th>العدد</th><th>النسبة</th></tr></thead><tbody>${rows}</tbody></table>`;
    exportPDF("لوحة الإحصائيات", html);
  };

  if (!submissions.length)
    return (
      <div className="empty">
        <div className="ei">📊</div>أدخل بيانات أسبوعية لتظهر الإحصائيات
      </div>
    );

  const activeMembers = members.filter(m => m.active);
  const filtered = (gid: string) =>
    gid === "all"
      ? activeMembers
      : activeMembers.filter(m => String(m.groupId) === String(gid));

  const weeklyData = submissions.map(sub => {
    const ms = filtered(groupFilter);
    const recs = ((sub.records || []) as Record<string, any>[]).filter(r =>
      ms.find(m => m.id === r.memberId)
    );
    const obj: Record<string, any> = { date: sub.date, total: ms.length };
    FIELDS.forEach(f => {
      obj[f.key] = recs.filter(r => r[f.key]).length;
      obj[`${f.key}%`] = ms.length ? Math.round((obj[f.key] / ms.length) * 100) : 0;
    });
    return obj;
  });

  const latest = weeklyData[weeklyData.length - 1] || {};
  const prev = weeklyData[weeklyData.length - 2];
  const trend = (k: string) => {
    if (!prev || !latest) return null;
    const d = (latest[`${k}%`] || 0) - (prev[`${k}%`] || 0);
    return d > 0
      ? { sign: "▲", val: d, up: true }
      : d < 0
      ? { sign: "▼", val: Math.abs(d), up: false }
      : null;
  };

  const groupComp = groups
    .filter(g => g.active)
    .map(g => {
      const sub = submissions[submissions.length - 1];
      const gm = activeMembers.filter(m => m.groupId === g.id);
      const recs = ((sub.records || []) as Record<string, any>[]).filter(r =>
        gm.find(m => m.id === r.memberId)
      );
      return {
        name: g.name.split("أسرة").pop()?.trim() || g.name,
        ...Object.fromEntries(FIELDS.map(f => [f.key, recs.filter(r => r[f.key]).length])),
        total: gm.length,
      };
    });

  const radarData = FIELDS.map(f => ({ field: f.key, value: latest[`${f.key}%`] || 0 }));

  const pieData = FIELDS.map(f => ({
    name: f.key,
    value: latest[f.key] || 0,
    color: f.color,
  }));

  return (
    <div>
      <div className="row" style={{ marginBottom: 16, gap: 10 }}>
        <select
          className="inp inp-sm"
          style={{ maxWidth: 240 }}
          value={groupFilter}
          onChange={e => setGroupFilter(e.target.value)}
        >
          <option value="all">جميع الأسر</option>
          {groups
            .filter(g => g.active)
            .map(g => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
        </select>
        <button className="btn btn-ghost btn-sm" onClick={exportDashPDF}>
          🖨️ تصدير PDF
        </button>
      </div>

      <div className="kpi-grid">
        {FIELDS.map(f => {
          const t = trend(f.key);
          return (
            <div key={f.key} className="kpi-card" style={{ borderTop: `3px solid ${f.color}` }}>
              <div className="kpi-lbl">
                <span className="chip-dot" style={{ background: f.color }} />
                {f.key}
              </div>
              <div className="kpi-val" style={{ color: f.color }}>
                {latest[f.key] || 0}
              </div>
              <div className="kpi-sub">
                {latest[`${f.key}%`] || 0}%
                {t && (
                  <span
                    style={{
                      marginRight: 6,
                      color: t.up ? "#10b981" : "#ef4444",
                      fontWeight: 700,
                    }}
                  >
                    {t.sign}
                    {t.val}%
                  </span>
                )}
              </div>
              <ProgBar pct={latest[`${f.key}%`] || 0} color={f.color} />
            </div>
          );
        })}
      </div>

      <div className="chart-grid">
        <div className="card chart-full">
          <div className="card-body">
            <div className="chart-ttl">📈 تطور المؤشرات الأسبوعية</div>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={weeklyData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F2E8E4" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fontFamily: "Cairo", fill: "#6B7280" }}
                />
                <YAxis tick={{ fontSize: 10, fill: "#6B7280" }} />
                <Tooltip
                  contentStyle={{
                    background: "#ffffff",
                    borderColor: "#F2E8E4",
                    borderRadius: 10,
                    fontFamily: "Cairo",
                    fontSize: 12,
                    direction: "rtl",
                    boxShadow: "0 4px 16px rgba(0,0,0,.08)",
                  }}
                />
                <Legend wrapperStyle={{ fontFamily: "Cairo", fontSize: 12, paddingTop: 8 }} />
                {FIELDS.map(f => (
                  <Line
                    key={f.key}
                    type="monotone"
                    dataKey={f.key}
                    stroke={f.color}
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: f.color }}
                    name={f.key}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="chart-ttl">📊 مقارنة الأسر (آخر أسبوع)</div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={groupComp} margin={{ top: 5, right: 5, bottom: 32, left: -15 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F2E8E4" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 9, fontFamily: "Cairo", fill: "#6B7280" }}
                  angle={-20}
                  textAnchor="end"
                />
                <YAxis tick={{ fontSize: 10, fill: "#6B7280" }} />
                <Tooltip
                  contentStyle={{
                    background: "#ffffff",
                    borderColor: "#F2E8E4",
                    borderRadius: 10,
                    fontFamily: "Cairo",
                    fontSize: 12,
                    direction: "rtl",
                    boxShadow: "0 4px 16px rgba(0,0,0,.08)",
                  }}
                />
                <Bar dataKey="حضور الخدمة" fill="#E73F1E" radius={[4, 4, 0, 0]} />
                <Bar dataKey="حضور القداس" fill="#FB6C00" radius={[4, 4, 0, 0]} />
                <Bar dataKey="خدمة القداس" fill="#FF8F00" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="chart-ttl">🕸 صورة شاملة (آخر أسبوع)</div>
            <ResponsiveContainer width="100%" height={240}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#F2E8E4" />
                <PolarAngleAxis
                  dataKey="field"
                  tick={{ fontSize: 10, fontFamily: "Cairo", fill: "#374151" }}
                />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9 }} />
                <Radar
                  dataKey="value"
                  stroke="#E73F1E"
                  fill="#FB6C00"
                  fillOpacity={0.35}
                />
                <Tooltip
                  contentStyle={{
                    background: "#ffffff",
                    borderColor: "#F2E8E4",
                    borderRadius: 10,
                    fontFamily: "Cairo",
                    fontSize: 12,
                    boxShadow: "0 4px 16px rgba(0,0,0,.08)",
                  }}
                  formatter={(v: any) => [`${v}%`]}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="chart-ttl">🥧 توزيع الأنشطة (آخر أسبوع)</div>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  dataKey="value"
                  label={({ value }: any) => `${value}`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ fontFamily: "Cairo", fontSize: 12, direction: "rtl" }}
                />
                <Legend wrapperStyle={{ fontFamily: "Cairo", fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
