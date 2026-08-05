"use client";

import { useEffect, useState } from "react";
import type { ServiceWeek, VisitationRecord } from "@/features/visitation/types/visitation";
import styles from "./member-visitation-history.module.css";

type HistoryRecord = VisitationRecord & { week: ServiceWeek | null };

const formatDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("ar-EG", {
  day: "numeric", month: "long", year: "numeric",
});

export function MemberVisitationHistory({ memberId }: { memberId: string }) {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void fetch(`/api/visitation?memberId=${encodeURIComponent(memberId)}`, { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "تعذر تحميل سجل الافتقاد.");
        if (active) setRecords(body);
      })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "تعذر تحميل سجل الافتقاد."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [memberId]);

  if (loading) return <div className={styles.state}>جارٍ تحميل سجل الافتقاد…</div>;
  if (error) return <div className={`${styles.state} ${styles.error}`}>{error}</div>;
  if (!records.length) return <div className={styles.state}>لا توجد زيارات مسجلة لهذا المخدوم حتى الآن.</div>;

  return <div className={styles.card} dir="rtl">
    <div className={styles.heading}><div><h3>سجل الافتقاد</h3><p>سجل كامل للزيارات السابقة — للقراءة فقط</p></div>
      <span>{records.length.toLocaleString("ar-EG")} سجل</span></div>
    <div className={styles.scroll}><table><thead><tr>
      <th>أسبوع الخدمة</th><th>نوع الافتقاد</th><th>التاريخ</th><th>الخادم</th><th>الملاحظات</th>
    </tr></thead><tbody>{records.map((record) => <tr key={record.id}>
      <td>{record.week ? `${formatDate(record.week.startDate)} — ${formatDate(record.week.endDate)}` : "—"}</td>
      <td><strong>{record.typeIcon} {record.typeName}</strong></td><td>{formatDate(record.visitedOn)}</td>
      <td>{record.servantName}</td><td className={styles.notes}>{record.notes || "—"}</td>
    </tr>)}</tbody></table></div>
  </div>;
}
