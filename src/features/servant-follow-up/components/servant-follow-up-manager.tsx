"use client";

import { useMemo, useState } from "react";

type UserOption = { id: string; full_name: string };
type FollowUpRow = {
  id: string; user_id: string; follow_up_date: string;
  friday_service_attendance: boolean; liturgy_attendance: boolean; lesson_preparation: boolean;
  users: { full_name: string } | { full_name: string }[] | null;
};
type ItemKey = "fridayServiceAttendance" | "liturgyAttendance" | "lessonPreparation";
type DayValue = Record<ItemKey, boolean>;
const emptyValue = (): DayValue => ({
  fridayServiceAttendance: false, liturgyAttendance: false, lessonPreparation: false,
});
const fields: { key: ItemKey; label: string; shortLabel: string }[] = [
  { key: "fridayServiceAttendance", label: "حضور خدمة الجمعة", shortLabel: "خدمة الجمعة" },
  { key: "liturgyAttendance", label: "حضور القداس", shortLabel: "القداس" },
  { key: "lessonPreparation", label: "تحضير الدرس", shortLabel: "تحضير الدرس" },
];

export function ServantFollowUpManager({ initialRows, initialDates, users }: {
  initialRows: FollowUpRow[]; initialDates: string[]; users: UserOption[];
}) {
  const initialDate = initialDates[0] || initialRows[0]?.follow_up_date || new Date().toISOString().slice(0, 10);
  const [rows, setRows] = useState(initialRows);
  const [date, setDate] = useState(initialDate);
  const [draft, setDraft] = useState<Record<string, DayValue>>({});
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const dayValues = useMemo(() => {
    const values: Record<string, DayValue> = {};
    users.forEach((user) => { values[user.id] = emptyValue(); });
    rows.filter((row) => row.follow_up_date === date).forEach((row) => {
      values[row.user_id] = {
        fridayServiceAttendance: row.friday_service_attendance,
        liturgyAttendance: row.liturgy_attendance,
        lessonPreparation: row.lesson_preparation,
      };
    });
    Object.entries(draft).forEach(([userId, value]) => { values[userId] = value; });
    return values;
  }, [date, draft, rows, users]);

  const filteredUsers = useMemo(() => users.filter((user) =>
    user.full_name.toLocaleLowerCase("ar").includes(query.toLocaleLowerCase("ar"))), [query, users]);
  const counts = Object.fromEntries(fields.map(({ key }) => [
    key, users.filter((user) => dayValues[user.id]?.[key]).length,
  ])) as Record<ItemKey, number>;

  const setValue = (userId: string, key: ItemKey, value: boolean) => {
    setDraft((current) => ({
      ...current,
      [userId]: { ...(dayValues[userId] || emptyValue()), [key]: value },
    }));
    setSuccess("");
  };
  const setAll = (key: ItemKey, value: boolean) => {
    setDraft((current) => {
      const next = { ...current };
      users.forEach((user) => {
        next[user.id] = { ...(dayValues[user.id] || emptyValue()), [key]: value };
      });
      return next;
    });
    setSuccess("");
  };
  const changeDate = (nextDate: string) => {
    setDate(nextDate); setDraft({}); setError(""); setSuccess("");
  };

  async function save() {
    setBusy(true); setError(""); setSuccess("");
    try {
      const response = await fetch("/api/servant-follow-up", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          followUpDate: date,
          records: users.map((user) => ({ userId: user.id, ...dayValues[user.id] })),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "تعذر حفظ المتابعة.");
      const names = new Map(users.map((user) => [user.id, user.full_name]));
      const saved = (result as Omit<FollowUpRow, "users">[]).map((row) => ({
        ...row, users: { full_name: names.get(row.user_id) || "—" },
      }));
      setRows((current) => [...saved, ...current.filter((row) => row.follow_up_date !== date)]);
      setDraft({});
      setSuccess("تم حفظ متابعة اليوم. أي خانة غير محددة تُحسب غيابًا تلقائيًا.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر حفظ المتابعة.");
    } finally { setBusy(false); }
  }

  const reportGroups = fields.map((field) => ({
    ...field,
    completed: users.filter((user) => dayValues[user.id]?.[field.key]),
    absent: users.filter((user) => !dayValues[user.id]?.[field.key]),
  }));
  function exportReport() {
    const lines = [["الفئة", "الحالة", "اسم الخادم"]];
    reportGroups.forEach((group) => {
      group.completed.forEach((user) => lines.push([group.label, "أتم", user.full_name]));
      group.absent.forEach((user) => lines.push([group.label, "لم يتم", user.full_name]));
    });
    const csv = "\uFEFF" + lines.map((line) =>
      line.map((cell) => `"${cell.replaceAll("\"", "\"\"")}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `servant-follow-up-${date}.csv`; anchor.click();
    URL.revokeObjectURL(url);
  }

  return <>
    <section className="stat-grid follow-up-stats" aria-label="ملخص المتابعة">
      <article className="stat-card"><span>إجمالي الخدام</span><strong>{users.length}</strong></article>
      <article className="stat-card"><span>حضروا خدمة الجمعة</span><strong>{counts.fridayServiceAttendance}</strong></article>
      <article className="stat-card"><span>حضروا القداس</span><strong>{counts.liturgyAttendance}</strong></article>
      <article className="stat-card"><span>حضّروا الدرس</span><strong>{counts.lessonPreparation}</strong></article>
    </section>

    <section className="management-card follow-up-entry">
      <div className="follow-up-toolbar">
        <div><h2>تسجيل متابعة اليوم</h2><p>حدد الحاضرين فقط؛ غير المحدد يُحسب غائبًا تلقائيًا.</p></div>
        <label>التاريخ<input type="date" value={date} onChange={(event) => changeDate(event.target.value)} /></label>
        <input type="search" placeholder="بحث باسم الخادم" value={query}
          onChange={(event) => setQuery(event.target.value)} />
      </div>
      <div className="table-scroll"><table>
        <thead><tr><th>الخادم</th>{fields.map((field) => <th key={field.key}>
          <span>{field.shortLabel}</span>
          <label className="select-all"><input type="checkbox"
            checked={users.length > 0 && counts[field.key] === users.length}
            onChange={(event) => setAll(field.key, event.target.checked)} />تحديد الكل</label>
        </th>)}</tr></thead>
        <tbody>{filteredUsers.map((user) => <tr key={user.id}><td>{user.full_name}</td>
          {fields.map((field) => <td key={field.key}><input className="follow-up-box" type="checkbox"
            aria-label={`${field.label} - ${user.full_name}`}
            checked={dayValues[user.id]?.[field.key] || false}
            onChange={(event) => setValue(user.id, field.key, event.target.checked)} /></td>)}
        </tr>)}{!filteredUsers.length && <tr><td colSpan={4}>لا يوجد خدام مطابقون للبحث.</td></tr>}</tbody>
      </table></div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {success && <p className="form-success" role="status">{success}</p>}
      <div className="follow-up-actions"><button type="button" disabled={busy || !users.length} onClick={() => void save()}>
        {busy ? "جارٍ الحفظ…" : "حفظ متابعة اليوم"}</button></div>
    </section>

    <section className="management-card follow-up-reports">
      <div className="follow-up-toolbar"><div><h2>تقرير متابعة الخدام</h2><p>التقرير بتاريخ {date}</p></div>
        <div className="follow-up-actions"><button type="button" onClick={exportReport}>تنزيل CSV</button>
          <button type="button" className="secondary" onClick={() => window.print()}>طباعة</button></div>
      </div>
      <div className="report-grid">{reportGroups.map((group) => <article key={group.key} className="report-category">
        <h3>{group.label}</h3>
        <div><h4>أتموا ({group.completed.length})</h4>
          <ul>{group.completed.map((user) => <li key={user.id}>{user.full_name}</li>)}
            {!group.completed.length && <li>لا يوجد</li>}</ul></div>
        <div><h4>لم يتم / غياب ({group.absent.length})</h4>
          <ul>{group.absent.map((user) => <li key={user.id}>{user.full_name}</li>)}
            {!group.absent.length && <li>لا يوجد</li>}</ul></div>
      </article>)}</div>
    </section>
  </>;
}
