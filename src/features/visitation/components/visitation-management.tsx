"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  AbsenceStatus,
  VisitationDashboardData,
  VisitationMember,
  VisitationType,
} from "@/features/visitation/types/visitation";
import styles from "./visitation-management.module.css";

const STATUS: Record<AbsenceStatus, { label: string; icon: string; color: string }> = {
  danger: { label: "خطر", icon: "🔴", color: "#b42318" },
  critical: { label: "حرج", icon: "🟠", color: "#d97706" },
  important: { label: "مهم", icon: "🟡", color: "#ca8a04" },
  regular: { label: "منتظم", icon: "🟢", color: "#15803d" },
};
const FILTERS: Array<{ key: "all" | AbsenceStatus; label: string }> = [
  { key: "all", label: "الكل" },
  { key: "danger", label: "خطر" },
  { key: "critical", label: "حرج" },
  { key: "important", label: "مهم" },
  { key: "regular", label: "منتظم" },
];

const formatDate = (date: string | null) => date
  ? new Date(`${date}T12:00:00`).toLocaleDateString("ar-EG", { day: "numeric", month: "short", year: "numeric" })
  : "—";

interface DialogState { member: VisitationMember; type: VisitationType }

export function VisitationManagement() {
  const [data, setData] = useState<VisitationDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | AbsenceStatus>("all");
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [focusedTypeCode, setFocusedTypeCode] = useState<string | null>(null);
  const workflowRef = useRef<HTMLDivElement>(null);

  const openWorkflow = (typeCode: string | null) => {
    setFocusedTypeCode(typeCode);
    if (!typeCode) setFilter("all");
    requestAnimationFrame(() => {
      const target = typeCode
        ? workflowRef.current?.querySelector<HTMLElement>(`[data-visitation-code="${typeCode}"]`)
        : workflowRef.current;
      target?.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    });
  };

  const load = useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/visitation", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "تعذر تحميل حالة الافتقاد.");
      setData(body);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر تحميل حالة الافتقاد.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const counts = useMemo(() => {
    const result = { danger: 0, critical: 0, important: 0, regular: 0 };
    for (const member of data?.members || []) result[member.status] += 1;
    return result;
  }, [data]);

  const visibleMembers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("ar");
    return (data?.members || []).filter((member) =>
      (filter === "all" || member.status === filter) &&
      (!query || [member.name, member.groupName, member.grade, member.responsibleServant]
        .some((value) => value.toLocaleLowerCase("ar").includes(query))),
    );
  }, [data, filter, search]);

  if (loading) return <PageState>جارٍ تحميل حالة الافتقاد…</PageState>;
  if (error && !data) return <PageState error>{error}</PageState>;
  if (!data) return null;

  return <section className={styles.page} dir="rtl">
    <header className={styles.heading}>
      <div>
        <p className={styles.eyebrow}>مركز المتابعة الأسبوعية</p>
        <h1>حالة الافتقاد</h1>
        <p>أسبوع الخدمة من {formatDate(data.currentWeek.startDate)} إلى {formatDate(data.currentWeek.endDate)} · الاجتماع {formatDate(data.currentWeek.meetingDate)}</p>
      </div>
      <span className={styles.weekBadge}>{data.currentWeek.closedAt ? "أسبوع مغلق" : "الأسبوع الحالي"}</span>
    </header>

    {error && <div className={styles.errorNotice}>{error}</div>}

    <div className={styles.summaryGrid}>
      {(Object.keys(STATUS) as AbsenceStatus[]).map((status) => <button type="button" key={status}
        className={`${styles.summaryCard} ${filter === status ? styles.selectedCard : ""}`}
        style={{ "--status-color": STATUS[status].color } as React.CSSProperties}
        onClick={() => setFilter(status)}>
        <span>{STATUS[status].icon} {STATUS[status].label}</span>
        <strong>{counts[status].toLocaleString("ar-EG")}</strong>
        <small>{status === "danger" ? "٣ غيابات أو أكثر" : status === "critical" ? "غيابان متتاليان" : status === "important" ? "غياب واحد" : "دون غياب متتالٍ"}</small>
      </button>)}
    </div>

    <section className={styles.quickActions} aria-labelledby="quick-actions-title">
      <h2 id="quick-actions-title">الإجراءات السريعة</h2>
      <div className={styles.quickActionGrid}>
        <button type="button" className={styles.quickActionCard} onClick={() => openWorkflow(null)}>
          <span className={styles.quickActionIcon} aria-hidden="true">☷</span>
          <span><strong>الحالات</strong><small>عرض جميع حالات الافتقاد ومتابعة المخدومين حسب مستوى الاهتمام.</small></span>
          <i aria-hidden="true">←</i>
        </button>
        <button type="button" className={`${styles.quickActionCard} ${focusedTypeCode === "phone" ? styles.focusedAction : ""}`}
          onClick={() => openWorkflow("phone")}>
          <span className={styles.quickActionIcon} aria-hidden="true">☎</span>
          <span><strong>الافتقاد التليفوني</strong><small>تسجيل أو تحديث الافتقاد التليفوني للمخدومين خلال أسبوع الخدمة الحالي.</small></span>
          <i aria-hidden="true">←</i>
        </button>
        <button type="button" className={`${styles.quickActionCard} ${focusedTypeCode === "home" ? styles.focusedAction : ""}`}
          onClick={() => openWorkflow("home")}>
          <span className={styles.quickActionIcon} aria-hidden="true">⌂</span>
          <span><strong>الافتقاد المنزلي</strong><small>تسجيل أو تحديث الافتقاد المنزلي للمخدومين خلال أسبوع الخدمة الحالي.</small></span>
          <i aria-hidden="true">←</i>
        </button>
      </div>
    </section>

    <div className={styles.workflow} ref={workflowRef}>
    <div className={styles.toolbar}>
      <div className={styles.tabs} role="tablist" aria-label="تصفية حالة الافتقاد">
        {FILTERS.map((item) => <button type="button" role="tab" aria-selected={filter === item.key}
          className={filter === item.key ? styles.activeTab : ""} key={item.key} onClick={() => setFilter(item.key)}>
          {item.label}{item.key !== "all" && <span>{counts[item.key]}</span>}
        </button>)}
      </div>
      <label className={styles.search}>
        <span aria-hidden="true">⌕</span>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="بحث بالاسم أو الأسرة أو الخادم…" />
      </label>
    </div>

    <div className={styles.tableCard}>
      <div className={styles.tableScroll}>
        <table>
          <thead><tr>
            <th>اسم المخدوم</th><th>الصف</th><th>الأسرة</th><th>الخادم المسؤول</th>
            <th>الغياب المتتالي</th><th>آخر حضور</th>
            {data.types.map((type) => <th key={type.id} data-visitation-code={type.code}
              className={focusedTypeCode === type.code ? styles.focusedColumn : undefined}>{type.icon} {type.nameAr} لهذا الأسبوع</th>)}
            <th>آخر ملاحظة</th>
          </tr></thead>
          <tbody>
            {visibleMembers.map((member) => <MemberRow key={member.id} member={member} types={data.types}
              canRecord={data.canRecord} focusedTypeCode={focusedTypeCode} onRecord={(type) => setDialog({ member, type })} />)}
          </tbody>
        </table>
      </div>
      {!visibleMembers.length && <div className={styles.empty}>لا توجد نتائج مطابقة.</div>}
      <footer className={styles.tableFooter}>عرض {visibleMembers.length.toLocaleString("ar-EG")} من {(data.members.length).toLocaleString("ar-EG")} مخدوم</footer>
    </div>
    </div>

    {dialog && <RecordDialog state={dialog} serviceWeekId={data.currentWeek.id} today={data.today} weekStart={data.currentWeek.startDate}
      weekEnd={data.currentWeek.endDate} onClose={() => setDialog(null)} onSaved={async () => {
        setDialog(null); setLoading(true); await load();
      }} />}
  </section>;
}

function MemberRow({ member, types, canRecord, focusedTypeCode, onRecord }: {
  member: VisitationMember; types: VisitationType[]; canRecord: boolean;
  focusedTypeCode: string | null;
  onRecord: (type: VisitationType) => void;
}) {
  const status = STATUS[member.status];
  return <tr>
    <td><Link className={styles.memberLink} href={`/dashboard/member/${member.id}`}>{member.name}</Link>
      <span className={styles.mobileStatus} style={{ color: status.color }}>{status.icon} {status.label}</span></td>
    <td>{member.grade}</td><td>{member.groupName}</td><td>{member.responsibleServant}</td>
    <td><span className={styles.absenceBadge} style={{ "--status-color": status.color } as React.CSSProperties}>
      {member.consecutiveAbsences.toLocaleString("ar-EG")} · {status.label}</span></td>
    <td>{formatDate(member.lastAttendance)}</td>
    {types.map((type) => {
      const records = member.currentVisitations.filter((record) => record.typeId === type.id);
      const latest = records[0];
      return <td key={type.id} className={focusedTypeCode === type.code ? styles.focusedColumn : undefined}><div className={styles.visitCell}>
        {latest ? <span className={styles.done} title={`${formatDate(latest.visitedOn)} · ${latest.servantName}`}>✓ تم {formatDate(latest.visitedOn)}</span>
          : <span className={styles.notDone}>لم يتم</span>}
        {canRecord && <button type="button" onClick={() => onRecord(type)}>{latest ? "تعديل" : "تسجيل"}</button>}
      </div></td>;
    })}
    <td className={styles.noteCell}>{member.lastNote || "—"}</td>
  </tr>;
}

function RecordDialog({ state, serviceWeekId, today, weekStart, weekEnd, onClose, onSaved }: {
  state: DialogState; serviceWeekId: string; today: string; weekStart: string; weekEnd: string;
  onClose: () => void; onSaved: () => Promise<void>;
}) {
  const existing = state.member.currentVisitations.find((record) => record.typeId === state.type.id);
  const [date, setDate] = useState(existing?.visitedOn || today);
  const [notes, setNotes] = useState(existing?.notes || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const response = await fetch("/api/visitation", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceWeekId, recordId: existing?.id, expectedVersion: existing?.version,
          memberId: state.member.id, visitationTypeId: state.type.id, visitedOn: date, notes }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "تعذر حفظ الافتقاد.");
      await onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر حفظ الافتقاد.");
      setSaving(false);
    }
  };
  return <div className={styles.dialogBackdrop} role="presentation" onMouseDown={(event) => {
    if (event.target === event.currentTarget) onClose();
  }}>
    <form className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="visitation-dialog-title" onSubmit={submit}>
      <header><div><small>{state.type.icon} {state.type.nameAr}</small><h2 id="visitation-dialog-title">{state.member.name}</h2>
        <p>{state.member.grade} · {state.member.groupName}</p></div>
        <button type="button" aria-label="إغلاق" onClick={onClose}>×</button></header>
      <div className={styles.dialogBody}>
        {error && <div className={styles.errorNotice}>{error}</div>}
        <label>التاريخ<input required type="date" min={weekStart} max={today < weekEnd ? today : weekEnd}
          value={date} onChange={(event) => setDate(event.target.value)} /></label>
        <label>الملاحظات<textarea maxLength={2000} rows={5} value={notes}
          onChange={(event) => setNotes(event.target.value)} placeholder="اكتب نتيجة الافتقاد وأي متابعة مطلوبة…" /></label>
        <p className={styles.autoSaveHint}>سيتم حفظ الخادم الحالي ووقت التسجيل تلقائيًا.</p>
      </div>
      <footer><button type="button" className={styles.cancelButton} onClick={onClose}>إلغاء</button>
        <button type="submit" className={styles.saveButton} disabled={saving}>{saving ? "جارٍ الحفظ…" : "حفظ الافتقاد"}</button></footer>
    </form>
  </div>;
}

function PageState({ children, error = false }: { children: React.ReactNode; error?: boolean }) {
  return <div className={`${styles.pageState} ${error ? styles.pageStateError : ""}`} dir="rtl">{children}</div>;
}
