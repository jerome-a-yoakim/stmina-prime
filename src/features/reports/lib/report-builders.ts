import type {
  ReportingAttendanceSession,
  ReportingDataset,
  ReportingMember,
} from "@/features/reports/types/reporting";

export type ReportId =
  | "overview" | "weekly" | "date-summary" | "family-attendance" | "member-attendance"
  | "absence" | "visitation" | "directory" | "member-export";

export interface ReportFilters {
  from: string;
  to: string;
  groupId: string;
  memberId: string;
  memberStatus: "active" | "archived" | "all";
  search: string;
}

export interface ReportKpi { label: string; value: string; hint?: string }
export interface ReportColumn { key: string; label: string }
export type ReportRow = Record<string, string | number>;
export interface ReportVisual { label: string; value: number; display: string }
export type WeeklyIndicatorKey = "serviceAttendance" | "liturgyAttendance" | "liturgyService" | "confession" | "phoneVisitation" | "homeVisitation";
export type WeeklyTrendPoint = { date: string; label: string; recorded: number } & Record<WeeklyIndicatorKey, number>;
export interface ReportView {
  id: ReportId;
  title: string;
  description: string;
  kpis: ReportKpi[];
  columns: ReportColumn[];
  rows: ReportRow[];
  visual?: ReportVisual[];
  drilldowns?: Array<{ id: ReportId; label: string }>;
  showTable?: boolean;
  note?: string;
}

export interface ReportDefinition {
  id: ReportId;
  category: "الحضور" | "الافتقاد" | "بيانات المخدومين";
  icon: string;
  title: string;
  description: string;
}

export const REPORTS: ReportDefinition[] = [
  { id: "overview", category: "الحضور", icon: "◫", title: "نظرة عامة على الحضور", description: "مؤشرات تنفيذ التسجيل والحضور عبر الفترة." },
  { id: "weekly", category: "الحضور", icon: "▦", title: "تقرير الحضور الأسبوعي", description: "سجل أسبوعي تفصيلي لكل مخدوم." },
  { id: "date-summary", category: "الحضور", icon: "⌁", title: "ملخص الحضور حسب الفترة", description: "مقارنة نتائج الاجتماعات خلال نطاق زمني." },
  { id: "family-attendance", category: "الحضور", icon: "⌂", title: "حضور الأسر", description: "مقارنة الحضور واكتمال التسجيل بين الأسر." },
  { id: "member-attendance", category: "الحضور", icon: "◎", title: "حضور المخدومين", description: "ملخص تاريخ الحضور والغياب لكل مخدوم." },
  { id: "absence", category: "الحضور", icon: "!", title: "الغياب المتتالي", description: "قائمة متابعة مرتبة حسب أولوية التدخل." },
  { id: "visitation", category: "الافتقاد", icon: "☎", title: "تغطية الافتقاد", description: "قياس تغطية افتقاد المتغيبين فعليًا." },
  { id: "directory", category: "بيانات المخدومين", icon: "☷", title: "دليل الأسر والمخدومين", description: "دليل اتصال منظم حسب الأسرة." },
  { id: "member-export", category: "بيانات المخدومين", icon: "⇩", title: "تصدير بيانات المخدومين", description: "بيانات إدارية شاملة قابلة للتصفية." },
];

const arNumber = (value: number) => new Intl.NumberFormat("ar-EG").format(value);
const arDate = (value?: string | null) => value
  ? new Intl.DateTimeFormat("ar-EG", { year: "numeric", month: "short", day: "numeric" }).format(new Date(`${value.slice(0, 10)}T12:00:00`))
  : "—";
const percent = (part: number, total: number) => total ? Math.round((part / total) * 100) : 0;
const yesNo = (value: boolean) => value ? "نعم" : "لا";
const attendanceStatus = (value: boolean) => value ? "حاضر" : "غائب";
const groupName = (data: ReportingDataset, id: string) => data.groups.find((group) => group.id === id)?.name || "—";

const isEligible = (member: ReportingMember, date: string) =>
  member.joinedAt <= date && (!member.archivedAt || member.archivedAt.slice(0, 10) > date);

function selectedMembers(data: ReportingDataset, filters: ReportFilters) {
  const search = filters.search.trim().toLocaleLowerCase("ar");
  return data.members.filter((member) => {
    if (filters.groupId && member.groupId !== filters.groupId) return false;
    if (filters.memberId && member.id !== filters.memberId) return false;
    if (filters.memberStatus === "active" && !member.active) return false;
    if (filters.memberStatus === "archived" && member.active) return false;
    if (!search) return true;
    return [member.fullName, member.phone, member.familyPhone, member.address, groupName(data, member.groupId)]
      .some((value) => value.toLocaleLowerCase("ar").includes(search));
  });
}

const selectedSessions = (data: ReportingDataset, filters: ReportFilters) =>
  data.sessions.filter((session) => (!filters.from || session.date >= filters.from) && (!filters.to || session.date <= filters.to));

export function buildWeeklyIndicatorTrends(data: ReportingDataset, filters: ReportFilters): WeeklyTrendPoint[] {
  const members = selectedMembers(data, filters);
  const memberIds = new Set(members.map((member) => member.id));
  const memberById = new Map(members.map((member) => [member.id, member]));
  return selectedSessions(data, filters).map((session) => {
    const records = session.records.filter((record) => {
      const member = memberById.get(record.memberId);
      return memberIds.has(record.memberId) && member ? isEligible(member, session.date) : false;
    });
    const ratio = (count: number) => percent(count, records.length);
    return {
      date: session.date,
      label: arDate(session.date),
      recorded: records.length,
      serviceAttendance: ratio(records.filter((record) => record.serviceAttended).length),
      liturgyAttendance: ratio(records.filter((record) => record.massAttended).length),
      liturgyService: ratio(records.filter((record) => record.massService).length),
      confession: ratio(records.filter((record) => record.confession).length),
      phoneVisitation: ratio(records.filter((record) => record.phoneFollowUp).length),
      homeVisitation: ratio(records.filter((record) => record.homeFollowUp).length),
    };
  });
}

interface AttendanceTotals { eligible: number; recorded: number; attended: number; absent: number; missing: number }
function totalsFor(members: ReportingMember[], sessions: ReportingAttendanceSession[]): AttendanceTotals {
  const totals = { eligible: 0, recorded: 0, attended: 0, absent: 0, missing: 0 };
  const memberIds = new Set(members.map((member) => member.id));
  const memberById = new Map(members.map((member) => [member.id, member]));
  for (const session of sessions) {
    const eligible = members.filter((member) => isEligible(member, session.date));
    const records = session.records.filter((record) => memberIds.has(record.memberId) && isEligible(memberById.get(record.memberId)!, session.date));
    totals.eligible += eligible.length;
    totals.recorded += records.length;
    totals.attended += records.filter((record) => record.serviceAttended).length;
  }
  totals.absent = totals.recorded - totals.attended;
  totals.missing = Math.max(0, totals.eligible - totals.recorded);
  return totals;
}

function memberStats(member: ReportingMember, sessions: ReportingAttendanceSession[]) {
  const eligible = sessions.filter((session) => isEligible(member, session.date));
  const records = eligible.flatMap((session) => {
    const record = session.records.find((item) => item.memberId === member.id);
    return record ? [{ ...record, date: session.date }] : [];
  });
  const attended = records.filter((record) => record.serviceAttended).length;
  const ordered = [...records].sort((a, b) => b.date.localeCompare(a.date));
  let consecutiveAbsences = 0;
  for (const record of ordered) {
    if (record.serviceAttended) break;
    consecutiveAbsences += 1;
  }
  return {
    eligible: eligible.length, recorded: records.length, attended,
    absent: records.length - attended, missing: eligible.length - records.length,
    rate: percent(attended, records.length), consecutiveAbsences,
    lastAttendance: ordered.find((record) => record.serviceAttended)?.date || null,
  };
}

const commonKpis = (totals: AttendanceTotals): ReportKpi[] => [
  { label: "نسبة الحضور", value: `${percent(totals.attended, totals.recorded)}%`, hint: "من السجلات المكتملة" },
  { label: "حضور", value: arNumber(totals.attended) },
  { label: "غياب مسجل", value: arNumber(totals.absent) },
  { label: "غير مسجل", value: arNumber(totals.missing), hint: "لا يُحسب غيابًا" },
];

function buildOverview(data: ReportingDataset, filters: ReportFilters): ReportView {
  const members = selectedMembers(data, filters);
  const sessions = selectedSessions(data, filters);
  const totals = totalsFor(members, sessions);
  return { id: "overview", title: "نظرة عامة على الحضور", description: "صورة تنفيذية تجمع الحضور واكتمال تسجيل الاجتماعات.",
    kpis: [
      { label: "الاجتماعات", value: arNumber(sessions.length) },
      { label: "المخدومون في النطاق", value: arNumber(members.length) },
      { label: "نسبة الحضور", value: `${percent(totals.attended, totals.recorded)}%`, hint: "من السجلات المكتملة" },
      { label: "اكتمال التسجيل", value: `${percent(totals.recorded, totals.eligible)}%`, hint: `${arNumber(totals.missing)} غير مسجل` },
    ],
    columns: [], rows: [], showTable: false,
    drilldowns: [
      { id: "date-summary", label: "عرض الملخص حسب التاريخ" },
      { id: "family-attendance", label: "مقارنة الأسر" },
      { id: "member-attendance", label: "تفاصيل المخدومين" },
      { id: "absence", label: "متابعة الغياب" },
    ] };
}

function buildWeekly(data: ReportingDataset, filters: ReportFilters): ReportView {
  const members = selectedMembers(data, filters);
  const memberById = new Map(members.map((member) => [member.id, member]));
  const sessions = selectedSessions(data, filters);
  const rows: ReportRow[] = [];
  for (const session of [...sessions].reverse()) {
    for (const record of session.records) {
      const member = memberById.get(record.memberId);
      if (!member || !isEligible(member, session.date)) continue;
      rows.push({ date: arDate(session.date), member: member.fullName, group: groupName(data, member.groupId),
        service: attendanceStatus(record.serviceAttended), mass: attendanceStatus(record.massAttended),
        massService: yesNo(record.massService), confession: yesNo(record.confession) });
    }
  }
  const totals = totalsFor(members, sessions);
  return { id: "weekly", title: "تقرير الحضور الأسبوعي", description: "تفاصيل السجلات التي تم إدخالها لكل اجتماع.",
    kpis: [{ label: "الاجتماعات", value: arNumber(sessions.length) }, { label: "السجلات", value: arNumber(totals.recorded) },
      { label: "اكتمال التسجيل", value: `${percent(totals.recorded, totals.eligible)}%` }, { label: "نسبة الحضور", value: `${percent(totals.attended, totals.recorded)}%` }],
    columns: [{ key: "date", label: "التاريخ" }, { key: "member", label: "المخدوم" }, { key: "group", label: "الأسرة" },
      { key: "service", label: "الخدمة" }, { key: "mass", label: "القداس" }, { key: "massService", label: "خدمة القداس" }, { key: "confession", label: "الاعتراف" }], rows };
}

function buildDateSummary(data: ReportingDataset, filters: ReportFilters): ReportView {
  const members = selectedMembers(data, filters);
  const sessions = selectedSessions(data, filters);
  const totals = totalsFor(members, sessions);
  const rows = sessions.map((session) => {
    const sessionTotals = totalsFor(members, [session]);
    return { date: arDate(session.date), eligible: sessionTotals.eligible, recorded: sessionTotals.recorded,
      attended: sessionTotals.attended, absent: sessionTotals.absent, missing: sessionTotals.missing,
      rate: `${percent(sessionTotals.attended, sessionTotals.recorded)}%` };
  }).reverse();
  return { id: "date-summary", title: "ملخص الحضور حسب الفترة", description: "مقارنة قابلة للتصدير بين تواريخ الاجتماعات.",
    kpis: commonKpis(totals),
    columns: [{ key: "date", label: "التاريخ" }, { key: "eligible", label: "المتوقع" }, { key: "recorded", label: "المسجل" },
      { key: "attended", label: "حضور" }, { key: "absent", label: "غياب" }, { key: "missing", label: "غير مسجل" }, { key: "rate", label: "النسبة" }],
    rows, visual: rows.slice(0, 10).map((row) => ({ label: String(row.date), value: Number(String(row.rate).replace("%", "")), display: String(row.rate) })) };
}

function buildFamilyAttendance(data: ReportingDataset, filters: ReportFilters): ReportView {
  const sessions = selectedSessions(data, filters);
  const allowedMembers = selectedMembers(data, filters);
  const groups = data.groups.filter((group) => !filters.groupId || group.id === filters.groupId);
  const rows = groups.map((group) => {
    const members = allowedMembers.filter((member) => member.groupId === group.id);
    const totals = totalsFor(members, sessions);
    return { family: group.name, grade: group.grade || "—", members: members.length, recorded: totals.recorded,
      attended: totals.attended, absent: totals.absent, missing: totals.missing, rate: `${percent(totals.attended, totals.recorded)}%` };
  }).filter((row) => row.members > 0).sort((a, b) => Number.parseInt(b.rate) - Number.parseInt(a.rate));
  const totals = totalsFor(allowedMembers, sessions);
  return { id: "family-attendance", title: "تقرير حضور الأسر", description: "مقارنة عادلة تعتمد على السجلات المكتملة وتعرض غير المسجل منفصلًا.",
    kpis: [{ label: "الأسر", value: arNumber(rows.length) }, ...commonKpis(totals).slice(0, 3)],
    columns: [{ key: "family", label: "الأسرة" }, { key: "grade", label: "المرحلة" }, { key: "members", label: "المخدومون" },
      { key: "recorded", label: "السجلات" }, { key: "attended", label: "حضور" }, { key: "absent", label: "غياب" }, { key: "missing", label: "غير مسجل" }, { key: "rate", label: "النسبة" }],
    rows };
}

function buildMemberAttendance(data: ReportingDataset, filters: ReportFilters): ReportView {
  const members = selectedMembers(data, filters);
  const sessions = selectedSessions(data, filters);
  const rows = members.map((member) => {
    const stats = memberStats(member, sessions);
    return { member: member.fullName, family: groupName(data, member.groupId), eligible: stats.eligible, recorded: stats.recorded,
      attended: stats.attended, absent: stats.absent, missing: stats.missing, rate: `${stats.rate}%`, lastAttendance: arDate(stats.lastAttendance) };
  }).sort((a, b) => Number.parseInt(b.rate) - Number.parseInt(a.rate));
  const totals = totalsFor(members, sessions);
  return { id: "member-attendance", title: "تقرير حضور المخدومين", description: "ملخص فردي يوضح الحضور والغياب ونقص التسجيل.",
    kpis: [{ label: "المخدومون", value: arNumber(members.length) }, ...commonKpis(totals).slice(0, 3)],
    columns: [{ key: "member", label: "المخدوم" }, { key: "family", label: "الأسرة" }, { key: "eligible", label: "المتوقع" },
      { key: "recorded", label: "المسجل" }, { key: "attended", label: "حضور" }, { key: "absent", label: "غياب" },
      { key: "missing", label: "غير مسجل" }, { key: "rate", label: "النسبة" }, { key: "lastAttendance", label: "آخر حضور" }], rows };
}

function absenceLabel(value: number) {
  if (value >= 3) return "عاجل";
  if (value === 2) return "حرج";
  if (value === 1) return "مهم";
  return "منتظم";
}

function buildAbsence(data: ReportingDataset, filters: ReportFilters): ReportView {
  const sessions = selectedSessions(data, filters);
  const entries = selectedMembers(data, { ...filters, memberStatus: "active" }).map((member) => ({ member, stats: memberStats(member, sessions) }));
  const rows = entries.filter(({ stats }) => stats.consecutiveAbsences > 0).sort((a, b) => b.stats.consecutiveAbsences - a.stats.consecutiveAbsences)
    .map(({ member, stats }) => ({ member: member.fullName, family: groupName(data, member.groupId), streak: stats.consecutiveAbsences,
      priority: absenceLabel(stats.consecutiveAbsences), lastAttendance: arDate(stats.lastAttendance),
      phone: member.phone || member.familyPhone || "—", responsible: member.responsibleServants.join("، ") || "—" }));
  return { id: "absence", title: "تقرير الغياب المتتالي", description: "الأولوية مبنية على آخر سجلات حضور مكتملة؛ السجل المفقود لا يُعد غيابًا.",
    kpis: [{ label: "يحتاجون متابعة", value: arNumber(rows.length) }, { label: "عاجل (3+)", value: arNumber(rows.filter((row) => Number(row.streak) >= 3).length) },
      { label: "حرج (2)", value: arNumber(rows.filter((row) => Number(row.streak) === 2).length) }, { label: "مهم (1)", value: arNumber(rows.filter((row) => Number(row.streak) === 1).length) }],
    columns: [{ key: "member", label: "المخدوم" }, { key: "family", label: "الأسرة" }, { key: "streak", label: "غيابات متتالية" },
      { key: "priority", label: "الأولوية" }, { key: "lastAttendance", label: "آخر حضور" }, { key: "phone", label: "الهاتف" }, { key: "responsible", label: "الخادم المسؤول" }], rows };
}

function buildVisitation(data: ReportingDataset, filters: ReportFilters): ReportView {
  const sessions = data.sessions.filter((session) => !filters.to || session.date <= filters.to);
  const atRisk = selectedMembers(data, { ...filters, memberStatus: "active" }).map((member) => ({ member, stats: memberStats(member, sessions) }))
    .filter(({ stats }) => stats.consecutiveAbsences > 0);
  const visits = data.visitations.filter((visit) => (!filters.from || visit.visitedOn >= filters.from) && (!filters.to || visit.visitedOn <= filters.to));
  const rows = atRisk.map(({ member, stats }) => {
    const memberVisits = visits.filter((visit) => visit.memberId === member.id).sort((a, b) => b.visitedOn.localeCompare(a.visitedOn));
    return { member: member.fullName, family: groupName(data, member.groupId), streak: stats.consecutiveAbsences,
      priority: absenceLabel(stats.consecutiveAbsences), phoneVisit: yesNo(memberVisits.some((visit) => visit.typeCode === "phone")),
      homeVisit: yesNo(memberVisits.some((visit) => visit.typeCode === "home")), latestVisit: arDate(memberVisits[0]?.visitedOn),
      servant: memberVisits[0]?.servantName || member.responsibleServants.join("، ") || "—", covered: memberVisits.length ? "تم" : "لم يتم" };
  }).sort((a, b) => Number(b.streak) - Number(a.streak));
  const covered = rows.filter((row) => row.covered === "تم").length;
  return { id: "visitation", title: "تقرير تغطية الافتقاد", description: "يقيس الافتقاد المسجل رسميًا للمتغيبين في الفترة المحددة.",
    kpis: [{ label: "المتغيبون", value: arNumber(rows.length) }, { label: "تم افتقادهم", value: arNumber(covered) },
      { label: "نسبة التغطية", value: `${percent(covered, rows.length)}%` }, { label: "بدون افتقاد", value: arNumber(rows.length - covered) }],
    columns: [{ key: "member", label: "المخدوم" }, { key: "family", label: "الأسرة" }, { key: "streak", label: "الغيابات" },
      { key: "priority", label: "الأولوية" }, { key: "phoneVisit", label: "تليفوني" }, { key: "homeVisit", label: "منزلي" },
      { key: "latestVisit", label: "آخر افتقاد" }, { key: "servant", label: "الخادم" }, { key: "covered", label: "التغطية" }], rows };
}

function buildDirectory(data: ReportingDataset, filters: ReportFilters): ReportView {
  const members = selectedMembers(data, filters);
  const rows = members.map((member) => ({ member: member.fullName, family: groupName(data, member.groupId),
    phone: member.phone || "—", familyPhone: member.familyPhone || "—", additionalPhone: member.additionalFamilyPhone || "—",
    address: member.address || "—", school: member.school || "—", birthDate: arDate(member.birthDate),
    activities: member.activityNames.join("، ") || "—", responsible: member.responsibleServants.join("، ") || "—" }));
  return { id: "directory", title: "دليل الأسر والمخدومين", description: "دليل الاتصال الحالي للأسر مع الأنشطة والخادم المسؤول.",
    kpis: [{ label: "المخدومون", value: arNumber(members.length) }, { label: "الأسر", value: arNumber(new Set(members.map((member) => member.groupId)).size) },
      { label: "بدون هاتف", value: arNumber(members.filter((member) => !member.phone && !member.familyPhone).length) },
      { label: "بدون عنوان", value: arNumber(members.filter((member) => !member.address).length) }],
    columns: [{ key: "member", label: "المخدوم" }, { key: "family", label: "الأسرة" }, { key: "phone", label: "الهاتف" },
      { key: "familyPhone", label: "هاتف الأسرة" }, { key: "additionalPhone", label: "هاتف إضافي" }, { key: "address", label: "العنوان" },
      { key: "school", label: "المدرسة" }, { key: "birthDate", label: "الميلاد" }, { key: "activities", label: "الأنشطة" }, { key: "responsible", label: "الخادم المسؤول" }], rows };
}

function buildMemberExport(data: ReportingDataset, filters: ReportFilters): ReportView {
  const members = selectedMembers(data, filters);
  const rows = members.map((member) => ({ id: member.id, member: member.fullName, givenName: member.givenName || "—", fatherName: member.fatherName || "—",
    family: groupName(data, member.groupId), status: member.active ? "نشط" : "مؤرشف", joinedAt: arDate(member.joinedAt), archivedAt: arDate(member.archivedAt),
    birthDate: arDate(member.birthDate), phone: member.phone || "—", familyPhone: member.familyPhone || "—", additionalPhone: member.additionalFamilyPhone || "—",
    address: member.address || "—", school: member.school || "—", brother: yesNo(member.brotherOfLord),
    activities: member.activityNames.join("، ") || "—", responsible: member.responsibleServants.join("، ") || "—" }));
  return { id: "member-export", title: "تصدير بيانات المخدومين", description: "مجموعة البيانات الإدارية الحالية ضمن نطاق صلاحياتك.",
    kpis: [{ label: "الإجمالي", value: arNumber(members.length) }, { label: "نشط", value: arNumber(members.filter((member) => member.active).length) },
      { label: "مؤرشف", value: arNumber(members.filter((member) => !member.active).length) },
      { label: "اكتمال الهاتف", value: `${percent(members.filter((member) => member.phone || member.familyPhone).length, members.length)}%` }],
    columns: [{ key: "member", label: "الاسم الكامل" }, { key: "givenName", label: "الاسم" }, { key: "fatherName", label: "اسم الأب" },
      { key: "family", label: "الأسرة" }, { key: "status", label: "الحالة" }, { key: "joinedAt", label: "تاريخ الانضمام" }, { key: "archivedAt", label: "تاريخ الأرشفة" },
      { key: "birthDate", label: "الميلاد" }, { key: "phone", label: "الهاتف" }, { key: "familyPhone", label: "هاتف الأسرة" },
      { key: "additionalPhone", label: "هاتف إضافي" }, { key: "address", label: "العنوان" }, { key: "school", label: "المدرسة" },
      { key: "brother", label: "أخ للرب" }, { key: "activities", label: "الأنشطة" }, { key: "responsible", label: "الخادم المسؤول" }], rows };
}

export function buildReport(id: ReportId, data: ReportingDataset, filters: ReportFilters): ReportView {
  const builders: Record<ReportId, () => ReportView> = {
    overview: () => buildOverview(data, filters), weekly: () => buildWeekly(data, filters),
    "date-summary": () => buildDateSummary(data, filters), "family-attendance": () => buildFamilyAttendance(data, filters),
    "member-attendance": () => buildMemberAttendance(data, filters), absence: () => buildAbsence(data, filters),
    visitation: () => buildVisitation(data, filters), directory: () => buildDirectory(data, filters),
    "member-export": () => buildMemberExport(data, filters),
  };
  return builders[id]();
}

export function filterDescription(data: ReportingDataset, filters: ReportFilters) {
  const group = filters.groupId ? groupName(data, filters.groupId) : "كل الأسر";
  const member = filters.memberId ? data.members.find((item) => item.id === filters.memberId)?.fullName || "—" : "كل المخدومين";
  const status = filters.memberStatus === "active" ? "النشطون" : filters.memberStatus === "archived" ? "المؤرشفون" : "كل الحالات";
  return [`الفترة: ${arDate(filters.from)} – ${arDate(filters.to)}`, `الأسرة: ${group}`, `المخدوم: ${member}`, `الحالة: ${status}`];
}
