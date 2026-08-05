"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { buildReport, type ReportFilters } from "@/features/reports/lib/report-builders";
import type { ReportingMember } from "@/features/reports/types/reporting";
import type { HomeDashboardData } from "@/features/dashboard/types/home-dashboard";
import styles from "./home-dashboard.module.css";

const arNumber = (value: number) => new Intl.NumberFormat("ar-EG").format(value);
const arDate = (value: string, options: Intl.DateTimeFormatOptions = { weekday: "long", year: "numeric", month: "long", day: "numeric" }) =>
  new Intl.DateTimeFormat("ar-EG", options).format(new Date(`${value}T12:00:00Z`));

function daysUntilBirthday(birthDate: string, today: string) {
  const [, month, day] = birthDate.slice(0, 10).split("-").map(Number);
  const [year, currentMonth, currentDay] = today.split("-").map(Number);
  const current = Date.UTC(year, currentMonth - 1, currentDay);
  let next = Date.UTC(year, month - 1, day);
  if (next < current) next = Date.UTC(year + 1, month - 1, day);
  return Math.round((next - current) / 86_400_000);
}

function birthdayLabel(days: number) {
  if (days === 0) return "اليوم 🎂";
  if (days === 1) return "غدًا";
  return `بعد ${arNumber(days)} أيام`;
}

function meetingCopy(today: string, meetingWeekday: number | null) {
  if (meetingWeekday === null) return null;
  const date = new Date(`${today}T12:00:00Z`);
  const isoToday = date.getUTCDay() || 7;
  const days = (meetingWeekday - isoToday + 7) % 7;
  const meetingDate = new Date(date);
  meetingDate.setUTCDate(date.getUTCDate() + days);
  const weekday = new Intl.DateTimeFormat("ar-EG", { weekday: "long" }).format(meetingDate);
  if (days === 0) return { label: "اجتماع اليوم 🎉", detail: weekday };
  if (days === 1) return { label: "الاجتماع القادم غدًا", detail: weekday };
  return { label: `الاجتماع القادم بعد ${arNumber(days)} أيام`, detail: weekday };
}

function reportHref(report: string, groupId: string) {
  const params = new URLSearchParams({ report });
  if (groupId) params.set("groupId", groupId);
  return `/dashboard/reports?${params.toString()}`;
}

export function HomeDashboard({ data }: { data: HomeDashboardData }) {
  const { actor, reporting } = data;
  const isManager = actor.roles.includes("system_owner") || actor.roles.includes("system_manager");
  const activeGroups = reporting.groups.filter((group) => group.active);
  const hasAssignment = isManager || activeGroups.length > 0;
  const [groupId, setGroupId] = useState(isManager ? "" : activeGroups[0]?.id || "");
  const selectedGroup = activeGroups.find((group) => group.id === groupId);
  const scopeName = selectedGroup?.name || "الإجمالي";
  const latestDate = reporting.sessions.at(-1)?.date || "";
  const filters = useMemo<ReportFilters>(() => ({
    from: reporting.defaultPeriod?.from || latestDate,
    to: reporting.defaultPeriod?.to || latestDate,
    groupId,
    memberId: "",
    memberStatus: "active",
    search: "",
  }), [groupId, latestDate, reporting.defaultPeriod]);
  const absence = useMemo(() => buildReport("absence", reporting, filters), [filters, reporting]);
  const visitation = useMemo(() => buildReport("visitation", reporting, filters), [filters, reporting]);
  const scopedMembers = useMemo(() => reporting.members.filter((member) => member.active && (!groupId || member.groupId === groupId)), [groupId, reporting.members]);
  const birthdays = useMemo(() => scopedMembers
    .filter((member): member is ReportingMember & { birthDate: string } => Boolean(member.birthDate))
    .map((member) => ({ member, days: daysUntilBirthday(member.birthDate, data.today) }))
    .filter((item) => item.days >= 0 && item.days <= 7)
    .sort((a, b) => a.days - b.days || a.member.fullName.localeCompare(b.member.fullName, "ar")), [data.today, scopedMembers]);
  const unvisited = visitation.rows.filter((row) => row.covered === "لم يتم").length;
  const urgent = absence.rows.filter((row) => Number(row.streak) >= 3).length;
  const meeting = meetingCopy(data.today, data.meetingWeekday);
  const firstName = actor.fullName.trim().split(/\s+/)[0] || actor.fullName;
  const greeting = data.currentHour < 12 ? "صباح الخير" : "مساء الخير";
  const hasAttendance = reporting.sessions.length > 0;
  const canViewVisitation = actor.permissions.includes("member_follow_up.read");
  const canWriteAttendance = actor.permissions.includes("member_attendance.write");
  const canViewMembers = actor.permissions.includes("members.read");
  const canViewReports = actor.permissions.includes("reports.read");
  const latestSessionRecords = useMemo(() => {
    const memberIds = new Set(scopedMembers.map((member) => member.id));
    return (reporting.sessions.at(-1)?.records || []).filter((record) => memberIds.has(record.memberId));
  }, [reporting.sessions, scopedMembers]);
  const weeklyMetrics = [
    { label: "حضور الخدمة", key: "serviceAttended" as const, icon: "□" },
    { label: "حضور القداس", key: "massAttended" as const, icon: "◇" },
    { label: "خدمة القداس", key: "massService" as const, icon: "✦" },
    { label: "الاعتراف", key: "confession" as const, icon: "○" },
    { label: "الافتقاد التليفوني", key: "phoneFollowUp" as const, icon: "☎" },
    { label: "الافتقاد المنزلي", key: "homeFollowUp" as const, icon: "⌂" },
  ].map((metric) => {
    const count = latestSessionRecords.filter((record) => record[metric.key]).length;
    const percentage = latestSessionRecords.length ? Math.round((count / latestSessionRecords.length) * 100) : 0;
    return { ...metric, count, percentage };
  });

  const snapshot = [
    { label: "يحتاجون متابعة", value: absence.kpis[0]?.value || "٠", hint: urgent ? `${arNumber(urgent)} متابعة عاجلة` : "حسب الغياب المتتالي", icon: "!", href: reportHref("absence", groupId) },
    { label: "تغطية الافتقاد", value: visitation.kpis[2]?.value || "٠٪", hint: `${visitation.kpis[1]?.value || "٠"} تم افتقادهم`, icon: "☎", href: reportHref("visitation", groupId) },
    ...(birthdays.length ? [{ label: "أعياد الميلاد القادمة", value: arNumber(birthdays.length), hint: "خلال الأيام السبعة القادمة", icon: "☆", href: "#upcoming-birthdays" }] : []),
  ];

  return <div className={styles.home} dir="rtl">
    <header className={styles.greeting}>
      <div className={styles.greetingCopy}>
        <span className={styles.eyebrow}>الرئيسية</span>
        <h1>{greeting}، {firstName} <span aria-hidden="true">👋</span></h1>
        <p>{arDate(data.today)}{!isManager && activeGroups.length === 1 ? ` — ${activeGroups[0].name}` : ""}</p>
      </div>
      {meeting && <div className={styles.meeting}><span>الاجتماع القادم</span><strong>{meeting.label}</strong><small>{meeting.detail}</small></div>}
    </header>

    {hasAssignment && <section className={styles.scope} aria-label="نطاق الصفحة">
      <label><span>نطاق الإحصائيات</span><select value={groupId} onChange={(event) => setGroupId(event.target.value)}>
        <option value="">الإجمالي</option>
        {activeGroups.map((group, index) => <option value={group.id} key={group.id}>
          {!isManager && index === 0 ? `أسرتي — ${group.name}` : group.name}{group.grade ? ` — ${group.grade}` : ""}
        </option>)}
      </select></label>
      <p>تعرض الصفحة الآن بيانات <strong>{scopeName}</strong>.</p>
    </section>}

    {hasAssignment && canViewVisitation && unvisited > 0 ? <Link className={`${styles.priorityAlert} ${styles.warning}`} href={`/dashboard/visitation${groupId ? `?groupId=${groupId}` : ""}`}>
      <span aria-hidden="true">!</span><div><strong>{arNumber(unvisited)} من المتغيبين لم يتم افتقادهم هذا الأسبوع</strong><small>أكمل الافتقاد قبل انتهاء أسبوع الخدمة.</small></div><b>عرض حالة الافتقاد ◀</b>
    </Link> : hasAssignment && urgent > 0 ? <Link className={`${styles.priorityAlert} ${styles.danger}`} href={reportHref("absence", groupId)}>
      <span aria-hidden="true">!</span><div><strong>{arNumber(urgent)} من المخدومين يحتاجون متابعة عاجلة</strong><small>لديهم ثلاثة غيابات متتالية أو أكثر.</small></div><b>عرض القائمة ◀</b>
    </Link> : null}

    {!hasAssignment ? <section className={styles.emptyScope}>
      <span aria-hidden="true">⌂</span><h2>لم يتم تعيينك لأسرة بعد</h2><p>تواصل مع مسؤول النظام لتعيين أسرة وتفعيل مساحة الخدمة الخاصة بك بالكامل.</p>
    </section> : !hasAttendance ? <section className={styles.emptyScope}>
      <span aria-hidden="true">□</span><h2>لا توجد بيانات حضور بعد</h2><p>ابدأ بتسجيل أول اجتماع لتظهر هنا حالة الأسرة والمتابعة.</p>
      {canWriteAttendance && <Link href="/dashboard/attendance">تسجيل الحضور</Link>}
    </section> : <section className={styles.snapshot} aria-labelledby="snapshot-title">
      <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>حالة الخدمة</span><h2 id="snapshot-title">لمحة عن {scopeName}</h2></div><small>أحدث أسبوع مسجل</small></div>
      <div className={styles.snapshotGrid}>{snapshot.map((item) => <Link className={styles.snapshotCard} href={item.href} key={item.label}>
        <span className={styles.tileIcon}>{item.icon}</span><div><small>{item.label}</small><strong>{item.value}</strong><em>{item.hint}</em></div><b>التفاصيل ◀</b>
      </Link>)}</div>
    </section>}

    {hasAssignment && hasAttendance && <section className={styles.weekly} aria-labelledby="weekly-title">
      <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>مؤشرات الأسبوع</span><h2 id="weekly-title">النسب الأسبوعية</h2></div><small>{latestDate ? `اجتماع ${arDate(latestDate, { day: "numeric", month: "long" })}` : "أحدث أسبوع"}</small></div>
      <div className={styles.metricGrid}>{weeklyMetrics.map((metric) => <Link className={styles.metricCard} href={reportHref("date-summary", groupId)} key={metric.key}>
        <span className={styles.tileIcon}>{metric.icon}</span><div><small>{metric.label}</small><strong>{arNumber(metric.percentage)}٪</strong><em>{arNumber(metric.count)} من {arNumber(latestSessionRecords.length)} سجلاً</em></div><b>التفاصيل ◀</b>
      </Link>)}</div>
    </section>}

    <section className={styles.quick} aria-labelledby="quick-title">
      <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>ابدأ الآن</span><h2 id="quick-title">إجراءات سريعة</h2></div></div>
      <div className={styles.quickGrid}>
        {hasAssignment && canWriteAttendance && <Link href="/dashboard/attendance"><span>□</span><strong>تسجيل الحضور</strong><small>بيانات الاجتماع الأسبوعي</small></Link>}
        {hasAssignment && canViewVisitation && <Link href="/dashboard/visitation"><span>◎</span><strong>تسجيل افتقاد</strong><small>متابعة المخدومين</small></Link>}
        {canViewMembers && <Link href="/dashboard/members"><span>♙</span><strong>المخدومين والأسر</strong><small>الملفات وبيانات الأسر</small></Link>}
        {canViewReports && <Link href="/dashboard/reports"><span>⌁</span><strong>التقارير</strong><small>التفاصيل والتحليلات</small></Link>}
      </div>
    </section>

    {(birthdays.length > 0 || data.spiritualMessage) && <div className={styles.connect}>
      {birthdays.length > 0 && <section className={styles.birthdays} id="upcoming-birthdays" aria-labelledby="birthdays-title">
        <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>نفرح معًا</span><h2 id="birthdays-title">أعياد الميلاد القادمة</h2></div><small>خلال ٧ أيام</small></div>
        <div className={styles.birthdayList}>{birthdays.map(({ member, days }) => <div className={days === 0 ? styles.birthdayToday : ""} key={member.id}>
          <span aria-hidden="true">{days === 0 ? "★" : "○"}</span><p><strong>{member.fullName}</strong><small>{reporting.groups.find((group) => group.id === member.groupId)?.name || "—"}</small></p><time dateTime={member.birthDate}>{birthdayLabel(days)}</time>
        </div>)}</div>
      </section>}
      {data.spiritualMessage && <section className={styles.verse} aria-labelledby="verse-title">
        <span className={styles.verseIcon} aria-hidden="true">✦</span><div><span className={styles.eyebrow}>رسالة اليوم</span><h2 id="verse-title">{data.spiritualMessage.text}</h2><p>{data.spiritualMessage.reference}</p></div>
      </section>}
    </div>}

    {canViewReports && <Link className={styles.fullReports} href="/dashboard/reports">عرض التقارير الكاملة ◀</Link>}
  </div>;
}
