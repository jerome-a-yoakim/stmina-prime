"use client";

import { useMemo, useState } from "react";
import { hasPermission } from "@/features/auth/authorization/permission-checker";
import { createGroup, deleteGroup, updateGroup } from "@/features/groups/data/group-service";
import {
  archiveMember, createMember, deleteMemberPermanently, restoreMember, updateMember,
} from "@/features/members/data/member-service";

const ROOT_TITLE = "المخدومين والأسر";
const UNASSIGNED_GRADE = "بدون صف / فصل";

function Dialog({ title, children, onClose, onSave, saving, saveLabel = "حفظ", wide = false }) {
  return <div className="hierarchy-dialog-backdrop" role="presentation" onMouseDown={onClose}>
    <section className={`hierarchy-dialog ${wide ? "is-wide" : ""}`} role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
      <div className="hierarchy-dialog-head"><h3>{title}</h3><button type="button" onClick={onClose} aria-label="إغلاق">×</button></div>
      <div className="hierarchy-dialog-body">{children}</div>
      <div className="hierarchy-dialog-actions">
        <button className="btn btn-ghost" type="button" onClick={onClose} disabled={saving}>إلغاء</button>
        <button className="btn btn-primary" type="button" onClick={onSave} disabled={saving}>{saving ? "جارٍ الحفظ…" : saveLabel}</button>
      </div>
    </section>
  </div>;
}

const emptyRegistration = (groupId) => ({
  groupId, givenName:"", fatherName:"", phone:"", familyPhone:"", additionalFamilyPhone:"",
  address:"", school:"", birthDate:"", brotherOfLord:false, notes:"",
});

function Breadcrumbs({ grade, family, onRoot, onGrade, onFamily }) {
  return <nav className="hierarchy-breadcrumb" aria-label="مسار التنقل">
    <button type="button" onClick={onRoot}>{ROOT_TITLE}</button>
    {grade !== null && <><span>‹</span><button type="button" onClick={onGrade}>{grade || UNASSIGNED_GRADE}</button></>}
    {family && <><span>‹</span><button type="button" onClick={onFamily}>{family.name}</button></>}
  </nav>;
}

export function MemberHierarchy({ currentUser, groups, members, submissions, servantAssignments = [], onUpdate, onViewProfile }) {
  const canEdit = hasPermission(currentUser, "edit_family_members");
  const [grade, setGrade] = useState(null);
  const [familyId, setFamilyId] = useState(null);
  const [view, setView] = useState("browse");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("name_asc");
  const [familyFilter, setFamilyFilter] = useState("all");
  const [showArchived, setShowArchived] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const activeGroups = useMemo(() => groups.filter((item) => item.active), [groups]);
  const grades = useMemo(() => {
    const values = new Map();
    activeGroups.forEach((item) => {
      const key = item.grade || "";
      if (!values.has(key)) values.set(key, { name: key, families: [] });
      values.get(key).families.push(item);
    });
    return [...values.values()].sort((a, b) => (a.name || UNASSIGNED_GRADE).localeCompare(b.name || UNASSIGNED_GRADE, "ar"));
  }, [activeGroups]);
  const selectedFamily = activeGroups.find((item) => String(item.id) === String(familyId)) || null;
  const gradeFamilies = activeGroups.filter((item) => (item.grade || "") === (grade || ""));

  const attendancePct = (memberId) => {
    const records = submissions.flatMap((submission) => (submission.records || []).filter((record) => String(record.memberId) === String(memberId)));
    if (!records.length) return 0;
    return Math.round(records.filter((record) => record["حضور الخدمة"]).length * 100 / records.length);
  };
  const lastAttendance = (memberId) => submissions
    .filter((submission) => (submission.records || []).some((record) => String(record.memberId) === String(memberId) && record["حضور الخدمة"]))
    .map((submission) => submission.dateISO || "")
    .sort((a, b) => b.localeCompare(a))[0] || "";

  const visibleMembers = useMemo(() => {
    let result = members;
    if (showArchived) result = result.filter((item) => !item.active);
    else result = result.filter((item) => item.active);
    if (!showArchived && view === "family" && selectedFamily) result = result.filter((item) => String(item.groupId) === String(selectedFamily.id));
    if (!showArchived && view === "grade") {
      const ids = new Set(gradeFamilies.map((item) => String(item.id)));
      result = result.filter((item) => ids.has(String(item.groupId)));
    }
    if (!showArchived && view === "all" && familyFilter !== "all") result = result.filter((item) => String(item.groupId) === String(familyFilter));
    const needle = search.trim().toLocaleLowerCase("ar");
    if (needle) result = result.filter((item) => item.name.toLocaleLowerCase("ar").includes(needle));
    return [...result].sort((a, b) => {
      if (sort === "name_desc") return b.name.localeCompare(a.name, "ar");
      if (sort === "attendance_desc") return attendancePct(b.id) - attendancePct(a.id);
      if (sort === "attendance_asc") return attendancePct(a.id) - attendancePct(b.id);
      if (sort === "recent_attendance") return lastAttendance(b.id).localeCompare(lastAttendance(a.id));
      if (sort === "oldest_attendance") return lastAttendance(a.id).localeCompare(lastAttendance(b.id));
      if (sort === "date_desc") return String(b.joinedAt || "").localeCompare(String(a.joinedAt || ""));
      if (sort === "date_asc") return String(a.joinedAt || "").localeCompare(String(b.joinedAt || ""));
      return a.name.localeCompare(b.name, "ar");
    });
  }, [members, showArchived, view, selectedFamily, gradeFamilies, familyFilter, search, sort, submissions]);

  const notify = (type, text) => { setMessage({ type, text }); window.setTimeout(() => setMessage(null), 3500); };
  const resetNavigation = () => { setGrade(null); setFamilyId(null); setView("browse"); setSearch(""); setShowArchived(false); };
  const openGrade = (name) => { setGrade(name); setFamilyId(null); setView("browse"); setSearch(""); setShowArchived(false); };
  const openFamily = (family) => { setGrade(family.grade || ""); setFamilyId(family.id); setView("family"); setSearch(""); setShowArchived(false); };

  const save = async () => {
    setSaving(true);
    try {
      if (dialog === "new-grade") {
        if (!form.grade?.trim() || !form.family?.trim()) throw new Error("اسم الصف / الفصل واسم الأسرة مطلوبان");
        await createGroup({ name: form.family.trim(), grade: form.grade.trim() });
        setGrade(form.grade.trim()); setView("browse");
      } else if (dialog === "rename-grade") {
        if (!form.grade?.trim()) throw new Error("اسم الصف / الفصل مطلوب");
        await Promise.all(gradeFamilies.map((item) => updateGroup(item.id, { grade: form.grade.trim() })));
        setGrade(form.grade.trim());
      } else if (dialog === "family") {
        if (!form.name?.trim()) throw new Error("اسم الأسرة مطلوب");
        const payload = { name: form.name.trim(), grade: form.grade ?? grade ?? "" };
        if (form.id) await updateGroup(form.id, payload); else await createGroup(payload);
        if (form.id && String(form.id) === String(familyId)) setGrade(payload.grade);
      } else if (dialog === "member") {
        if (!form.id || !form.groupId) throw new Error("الأسرة مطلوبة");
        await updateMember(form.id, { groupId: form.groupId });
      } else if (dialog === "registration") {
        const givenName = form.givenName?.trim();
        const fatherName = form.fatherName?.trim();
        if (!givenName || !fatherName) throw new Error("اسم المخدوم واسم الأب مطلوبان");
        if (!form.groupId) throw new Error("يجب إنشاء المخدوم من داخل أسرة");
        for (const phone of [form.phone, form.familyPhone, form.additionalFamilyPhone]) {
          if (phone?.trim().length > 30) throw new Error("رقم الهاتف يجب ألا يتجاوز 30 حرفًا");
        }
        const today = new Date().toISOString().slice(0, 10);
        if (form.birthDate && form.birthDate > today) throw new Error("تاريخ الميلاد لا يمكن أن يكون في المستقبل");
        const optional = (value) => value?.trim() || null;
        await createMember({
          groupId: form.groupId,
          givenName,
          fatherName,
          fullName: `${givenName} ${fatherName}`.replace(/\s+/g, " ").trim(),
          phone: optional(form.phone),
          familyPhone: optional(form.familyPhone),
          additionalFamilyPhone: optional(form.additionalFamilyPhone),
          address: optional(form.address),
          school: optional(form.school),
          birthDate: form.birthDate || null,
          brotherOfLord: Boolean(form.brotherOfLord),
          notes: optional(form.notes),
        });
      }
      await onUpdate();
      setDialog(null);
      notify("success", "تم حفظ التغييرات بنجاح");
    } catch (error) {
      notify("error", error?.message || "تعذر حفظ التغييرات");
    } finally { setSaving(false); }
  };

  const archive = async (member) => {
    if (!window.confirm(`أرشفة "${member.name}"؟`)) return;
    try { await archiveMember(member.id); await onUpdate(); notify("success", "تمت أرشفة المخدوم"); }
    catch (error) { notify("error", error?.message || "تعذرت الأرشفة"); }
  };
  const restore = async (member) => {
    try { await restoreMember(member.id); await onUpdate(); notify("success", "تمت استعادة المخدوم"); }
    catch (error) { notify("error", error?.message || "تعذرت الاستعادة"); }
  };
  const removeMember = async (member) => {
    if (!window.confirm(`حذف "${member.name}" نهائيًا؟`)) return;
    try { await deleteMemberPermanently(member.id); await onUpdate(); notify("success", "تم حذف المخدوم"); }
    catch (error) { notify("error", error?.message || "تعذر الحذف"); }
  };
  const removeFamily = async (family) => {
    const childCount = members.filter((item) => String(item.groupId) === String(family.id)).length;
    if (childCount) return notify("error", "لا يمكن حذف أسرة تحتوي على مخدومين. انقل أو احذف المخدومين أولًا.");
    if (!window.confirm(`حذف أسرة "${family.name}"؟`)) return;
    try { await deleteGroup(family.id); await onUpdate(); setFamilyId(null); setView("browse"); notify("success", "تم حذف الأسرة"); }
    catch (error) { notify("error", error?.message || "تعذر حذف الأسرة"); }
  };

  const memberTable = <div className="card hierarchy-member-card">
    <div className="card-header hierarchy-list-head">
      <div><h3>{showArchived ? "الأرشيف" : view === "family" ? selectedFamily?.name : view === "grade" ? `كل مخدومي ${grade || UNASSIGNED_GRADE}` : "جميع المخدومين"}</h3><small>{visibleMembers.length} مخدوم</small></div>
      {canEdit && view === "family" && selectedFamily && !showArchived && <button className="btn btn-primary btn-sm" type="button" onClick={() => { setForm(emptyRegistration(selectedFamily.id)); setDialog("registration"); }}>+ مخدوم جديد</button>}
    </div>
    <div className="card-body">
      <div className="hierarchy-tools">
        <input className="inp inp-sm" aria-label="بحث" placeholder="بحث بالاسم…" value={search} onChange={(event) => setSearch(event.target.value)} />
        {view === "all" && !showArchived && <select className="inp inp-sm" aria-label="تصفية حسب الأسرة" value={familyFilter} onChange={(event) => setFamilyFilter(event.target.value)}><option value="all">جميع الأسر</option>{activeGroups.map((family) => <option key={family.id} value={family.id}>{family.name}</option>)}</select>}
        <select className="inp inp-sm" aria-label="الترتيب" value={sort} onChange={(event) => setSort(event.target.value)}><option value="name_asc">الاسم: أ–ي</option><option value="name_desc">الاسم: ي–أ</option><option value="attendance_desc">الأعلى حضورًا</option><option value="attendance_asc">الأقل حضورًا</option><option value="recent_attendance">الأحدث حضورًا</option><option value="oldest_attendance">الأقدم حضورًا</option><option value="date_desc">الأحدث انضمامًا</option><option value="date_asc">الأقدم انضمامًا</option></select>
      </div>
      <div className="scroll-x"><table className="tbl"><thead><tr><th>#</th><th>الاسم</th><th>الصف / الفصل</th><th>الأسرة</th><th>الحالة</th><th>الحضور</th><th>إجراءات</th></tr></thead>
        <tbody>{visibleMembers.map((member, index) => { const family = groups.find((item) => String(item.id) === String(member.groupId)); return <tr key={member.id} className={!member.active ? "archived-row" : ""}>
          <td>{index + 1}</td><td><button className="hierarchy-name-link" type="button" onClick={() => onViewProfile(member)}>{member.name}</button></td><td>{family?.grade || UNASSIGNED_GRADE}</td><td><button className="hierarchy-text-button" type="button" onClick={() => family && openFamily(family)}>{family?.name || "—"}</button></td><td><span className={`badge ${member.active ? "badge-green" : "badge-gray"}`}>{member.active ? "نشط" : "مؤرشف"}</span></td><td>{attendancePct(member.id)}%</td>
          <td><div className="row"><button className="btn btn-ghost btn-xs" type="button" onClick={() => onViewProfile(member)}>ملف</button>{canEdit && member.active && <><button className="btn btn-ghost btn-xs" type="button" onClick={() => { setForm({ id:member.id, groupId:member.groupId }); setDialog("member"); }}>نقل</button><button className="btn btn-ghost btn-xs" type="button" onClick={() => archive(member)}>أرشفة</button></>}{canEdit && !member.active && <><button className="btn btn-ghost btn-xs" type="button" onClick={() => restore(member)}>استعادة</button><button className="btn btn-danger btn-xs" type="button" onClick={() => removeMember(member)}>حذف</button></>}</div></td>
        </tr>; })}{!visibleMembers.length && <tr><td colSpan={7}><div className="empty">لا توجد نتائج</div></td></tr>}</tbody>
      </table></div>
    </div>
  </div>;

  return <div className="member-hierarchy">
    <style>{HIERARCHY_CSS}</style>
    {message && <div className={`hierarchy-message ${message.type}`}>{message.text}</div>}
    <header className="hierarchy-header"><div><p>إدارة الخدمة</p><h1>{ROOT_TITLE}</h1></div><div className="row">
      <button className={`btn btn-sm ${showArchived ? "btn-primary" : "btn-outline"}`} type="button" onClick={() => { setShowArchived(!showArchived); setView("all"); setGrade(null); setFamilyId(null); setSearch(""); }}>{showArchived ? "العودة إلى النشطين" : "الأرشيف"}</button>
      <button className="btn btn-outline btn-sm" type="button" onClick={() => { setView("all"); setGrade(null); setFamilyId(null); setShowArchived(false); setSearch(""); }}>إظهار جميع المخدومين</button>
      {canEdit && grade === null && <button className="btn btn-primary btn-sm" type="button" onClick={() => { setForm({ grade:"", family:"" }); setDialog("new-grade"); }}>+ صف / فصل جديد</button>}
    </div></header>
    <Breadcrumbs grade={grade} family={selectedFamily} onRoot={resetNavigation} onGrade={() => { setFamilyId(null); setView("browse"); setShowArchived(false); }} onFamily={() => setView("family")} />

    {!showArchived && view === "browse" && grade === null && <div className="hierarchy-grid">{grades.map((item) => {
      const familyIds = new Set(item.families.map((family) => String(family.id)));
      const count = members.filter((member) => member.active && familyIds.has(String(member.groupId))).length;
      return <button className="hierarchy-folder" type="button" key={item.name || "__empty"} onClick={() => openGrade(item.name)}><span className="hierarchy-folder-icon">▰</span><strong>{item.name || UNASSIGNED_GRADE}</strong><span>{item.families.length} أسرة</span><span>{count} مخدوم</span></button>;
    })}{!grades.length && <div className="empty">لا توجد صفوف أو فصول متاحة</div>}</div>}

    {!showArchived && view === "browse" && grade !== null && <>
      <div className="hierarchy-section-head"><div><h2>{grade || UNASSIGNED_GRADE}</h2><p>{gradeFamilies.length} أسرة</p></div><div className="row"><button className="btn btn-outline btn-sm" type="button" onClick={() => setView("grade")}>إظهار جميع أعضاء الصف</button>{canEdit && <><button className="btn btn-ghost btn-sm" type="button" onClick={() => { setForm({ grade:grade || "" }); setDialog("rename-grade"); }}>إعادة تسمية</button><button className="btn btn-primary btn-sm" type="button" onClick={() => { setForm({ name:"", grade:grade || "" }); setDialog("family"); }}>+ أسرة جديدة</button></>}</div></div>
      <div className="hierarchy-grid">{gradeFamilies.map((family) => { const count = members.filter((member) => member.active && String(member.groupId) === String(family.id)).length; const servantCount = servantAssignments.filter((assignment) => String(assignment.groupId) === String(family.id)).length; return <article className="hierarchy-family" key={family.id}><button className="hierarchy-family-main" type="button" onClick={() => openFamily(family)}><span>⌂</span><strong>{family.name}</strong><small>{count} مخدوم · {servantCount} خادم مسؤول</small></button>{canEdit && <div className="hierarchy-card-actions"><button type="button" onClick={() => { setForm({ id:family.id, name:family.name, grade:family.grade || "" }); setDialog("family"); }}>تعديل / نقل</button><button type="button" onClick={() => removeFamily(family)}>حذف</button></div>}</article>; })}</div>
    </>}

    {!showArchived && view === "family" && selectedFamily && <>
      <div className="hierarchy-section-head"><div><h2>{selectedFamily.name}</h2><p>{selectedFamily.grade || UNASSIGNED_GRADE}</p></div>{canEdit && <button className="btn btn-ghost btn-sm" type="button" onClick={() => { setForm({ id:selectedFamily.id, name:selectedFamily.name, grade:selectedFamily.grade || "" }); setDialog("family"); }}>تعديل الأسرة / نقلها</button>}</div>
      <section className="card hierarchy-servants"><div className="card-header"><h3>الخدام المسؤولون</h3><span className="badge badge-blue">{servantAssignments.filter((assignment) => String(assignment.groupId) === String(selectedFamily.id)).length}</span></div><div className="card-body">{servantAssignments.some((assignment) => String(assignment.groupId) === String(selectedFamily.id)) ? <div className="hierarchy-servant-list">{servantAssignments.filter((assignment) => String(assignment.groupId) === String(selectedFamily.id)).map((assignment) => <span key={`${assignment.groupId}-${assignment.userId}`}>{assignment.isPrimary ? "الخادم الرئيسي" : "خادم مسؤول"}<strong>{assignment.name}</strong></span>)}</div> : <div className="empty">لا يوجد خدام نشطون مكلفون بهذه الأسرة من إدارة المستخدمين</div>}<p className="hierarchy-assignment-note">تُحدّث هذه القائمة تلقائيًا من تكليفات إدارة المستخدمين.</p></div></section>
      {memberTable}
    </>}
    {(view === "all" || view === "grade" || showArchived) && memberTable}

    {dialog === "new-grade" && <Dialog title="إنشاء صف / فصل جديد" onClose={() => setDialog(null)} onSave={save} saving={saving}><p className="hierarchy-hint">لأن الصفوف محفوظة ضمن الأسر في النظام الحالي، أضف الأسرة الأولى معه.</p><label className="form-label">اسم الصف / الفصل</label><input className="inp" value={form.grade || ""} onChange={(event) => setForm({ ...form, grade:event.target.value })}/><label className="form-label">اسم الأسرة الأولى</label><input className="inp" value={form.family || ""} onChange={(event) => setForm({ ...form, family:event.target.value })}/></Dialog>}
    {dialog === "rename-grade" && <Dialog title="إعادة تسمية الصف / الفصل" onClose={() => setDialog(null)} onSave={save} saving={saving}><label className="form-label">الاسم</label><input className="inp" value={form.grade || ""} onChange={(event) => setForm({ ...form, grade:event.target.value })}/></Dialog>}
    {dialog === "family" && <Dialog title={form.id ? "تعديل الأسرة" : "إنشاء أسرة جديدة"} onClose={() => setDialog(null)} onSave={save} saving={saving}><label className="form-label">اسم الأسرة</label><input className="inp" value={form.name || ""} onChange={(event) => setForm({ ...form, name:event.target.value })}/><label className="form-label">الصف / الفصل</label><select className="inp" value={form.grade ?? ""} onChange={(event) => setForm({ ...form, grade:event.target.value })}>{grades.map((item) => <option key={item.name || "__empty"} value={item.name}>{item.name || UNASSIGNED_GRADE}</option>)}</select><p className="hierarchy-hint">يتم تعيين الخدام المسؤولين من إدارة المستخدمين فقط.</p></Dialog>}
    {dialog === "member" && <Dialog title="نقل المخدوم إلى أسرة أخرى" onClose={() => setDialog(null)} onSave={save} saving={saving}><label className="form-label">الأسرة</label><select className="inp" value={form.groupId || ""} onChange={(event) => setForm({ ...form, groupId:event.target.value })}>{activeGroups.map((family) => <option key={family.id} value={family.id}>{family.grade ? `${family.grade} — ` : ""}{family.name}</option>)}</select></Dialog>}
    {dialog === "registration" && <Dialog title="استمارة تسجيل المخدوم" onClose={() => setDialog(null)} onSave={save} saving={saving} saveLabel="تسجيل المخدوم" wide>
      <div className="registration-form">
        <fieldset><legend>البيانات الأساسية</legend><div className="registration-grid">
          <label><span className="form-label">اسم المخدوم <b>*</b></span><input className="inp" required maxLength={80} value={form.givenName || ""} onChange={(event) => setForm({ ...form, givenName:event.target.value })}/></label>
          <label><span className="form-label">اسم الأب <b>*</b></span><input className="inp" required maxLength={80} value={form.fatherName || ""} onChange={(event) => setForm({ ...form, fatherName:event.target.value })}/></label>
          <label><span className="form-label">تاريخ الميلاد</span><input className="inp" type="date" max={new Date().toISOString().slice(0, 10)} value={form.birthDate || ""} onChange={(event) => setForm({ ...form, birthDate:event.target.value })}/></label>
          <label className="registration-check"><input type="checkbox" checked={Boolean(form.brotherOfLord)} onChange={(event) => setForm({ ...form, brotherOfLord:event.target.checked })}/><span>أخ للرب؟</span></label>
        </div></fieldset>
        <fieldset><legend>بيانات التواصل</legend><div className="registration-grid">
          <label><span className="form-label">رقم الهاتف الشخصي (إن وجد)</span><input className="inp" type="tel" inputMode="tel" maxLength={30} value={form.phone || ""} onChange={(event) => setForm({ ...form, phone:event.target.value })}/></label>
          <label><span className="form-label">رقم هاتف ولي الأمر</span><input className="inp" type="tel" inputMode="tel" maxLength={30} value={form.familyPhone || ""} onChange={(event) => setForm({ ...form, familyPhone:event.target.value })}/></label>
          <label><span className="form-label">رقم هاتف إضافي لولي الأمر (إن وجد)</span><input className="inp" type="tel" inputMode="tel" maxLength={30} value={form.additionalFamilyPhone || ""} onChange={(event) => setForm({ ...form, additionalFamilyPhone:event.target.value })}/></label>
          <label><span className="form-label">محل الإقامة</span><input className="inp" maxLength={300} value={form.address || ""} onChange={(event) => setForm({ ...form, address:event.target.value })}/></label>
        </div></fieldset>
        <fieldset><legend>البيانات الدراسية</legend><label><span className="form-label">المدرسة</span><input className="inp" maxLength={120} value={form.school || ""} onChange={(event) => setForm({ ...form, school:event.target.value })}/></label></fieldset>
        <fieldset><legend>بيانات الخدمة</legend><label><span className="form-label">ملاحظات الانضمام للخدمة</span><textarea className="inp" rows={4} maxLength={1000} value={form.notes || ""} onChange={(event) => setForm({ ...form, notes:event.target.value })}/></label></fieldset>
      </div>
    </Dialog>}
  </div>;
}

const HIERARCHY_CSS = `
.member-hierarchy{direction:rtl;display:grid;gap:18px;animation:hierarchy-in .22s ease-out}.hierarchy-header,.hierarchy-section-head,.hierarchy-list-head{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}.hierarchy-header p,.hierarchy-section-head p{margin:0;color:var(--muted);font-size:12px}.hierarchy-header h1,.hierarchy-section-head h2{margin:2px 0 0}.hierarchy-breadcrumb{display:flex;align-items:center;gap:7px;flex-wrap:wrap;color:var(--muted)}.hierarchy-breadcrumb button,.hierarchy-text-button,.hierarchy-name-link{border:0;background:none;color:var(--primary);font:inherit;cursor:pointer;padding:3px}.hierarchy-name-link{font-weight:800}.hierarchy-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px}.hierarchy-folder,.hierarchy-family{border:1px solid var(--border);background:var(--card);border-radius:13px;box-shadow:var(--shadow);transition:transform .18s,border-color .18s}.hierarchy-folder{min-height:145px;padding:20px;text-align:right;display:grid;gap:6px;cursor:pointer;color:var(--text)}.hierarchy-folder:hover,.hierarchy-family:hover{transform:translateY(-2px);border-color:var(--primary)}.hierarchy-folder-icon{font-size:28px;color:var(--primary)}.hierarchy-folder strong,.hierarchy-family strong{font-size:16px}.hierarchy-folder span:not(.hierarchy-folder-icon){color:var(--muted);font-size:12px}.hierarchy-family{overflow:hidden}.hierarchy-family-main{border:0;background:none;color:var(--text);width:100%;padding:20px;display:grid;gap:8px;text-align:right;cursor:pointer}.hierarchy-family-main>span{font-size:25px;color:var(--primary)}.hierarchy-family-main small{color:var(--muted)}.hierarchy-card-actions{border-top:1px solid var(--border);display:flex}.hierarchy-card-actions button{flex:1;border:0;background:var(--card2);color:var(--muted);padding:9px;cursor:pointer}.hierarchy-card-actions button:hover{color:var(--primary)}.hierarchy-tools{display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap}.hierarchy-tools .inp{max-width:240px}.hierarchy-servants{margin-bottom:0}.hierarchy-servant-list{display:flex;gap:10px;flex-wrap:wrap}.hierarchy-servant-list span{display:grid;gap:3px;background:var(--card2);border:1px solid var(--border);border-radius:10px;padding:10px 14px;font-size:11px;color:var(--muted)}.hierarchy-servant-list strong{font-size:13px;color:var(--text)}.hierarchy-assignment-note{margin:12px 0 0;color:var(--muted);font-size:11px}.hierarchy-dialog-backdrop{position:fixed;inset:0;background:#0f172a99;z-index:1000;display:grid;place-items:center;padding:18px}.hierarchy-dialog{width:min(520px,100%);max-height:90vh;overflow:auto;background:var(--card);border:1px solid var(--border);border-radius:15px;box-shadow:0 20px 70px #0005}.hierarchy-dialog.is-wide{width:min(780px,100%)}.hierarchy-dialog-head,.hierarchy-dialog-actions{display:flex;align-items:center;justify-content:space-between;padding:15px 18px;border-bottom:1px solid var(--border)}.hierarchy-dialog-head h3{margin:0}.hierarchy-dialog-head button{border:0;background:none;color:var(--muted);font-size:24px;cursor:pointer}.hierarchy-dialog-body{padding:18px;display:grid;gap:8px}.hierarchy-dialog-actions{border:0;border-top:1px solid var(--border);justify-content:flex-end;gap:8px}.hierarchy-hint{margin:0 0 8px;padding:10px;border-radius:8px;background:var(--card2);color:var(--muted);font-size:12px}.registration-form{display:grid;gap:16px}.registration-form fieldset{margin:0;padding:16px;border:1px solid var(--border);border-radius:12px;background:var(--card2)}.registration-form legend{padding:0 8px;color:var(--primary);font-size:13px;font-weight:700}.registration-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.registration-form label{display:grid;gap:6px}.registration-form .form-label{margin:0}.registration-form .form-label b{color:var(--danger)}.registration-check{align-content:center;grid-template-columns:auto 1fr!important;align-items:center;padding-top:22px}.registration-check input{width:18px;height:18px;accent-color:var(--primary)}.hierarchy-message{position:fixed;top:18px;left:50%;transform:translateX(-50%);z-index:1100;padding:10px 18px;border-radius:9px;color:#fff;box-shadow:0 8px 25px #0003}.hierarchy-message.success{background:#047857}.hierarchy-message.error{background:#b91c1c}.hierarchy-list-head small{color:var(--muted)}@keyframes hierarchy-in{from{opacity:0;transform:translateY(5px)}}@media(max-width:640px){.hierarchy-header,.hierarchy-section-head{align-items:stretch}.hierarchy-header>.row,.hierarchy-section-head>.row{width:100%}.hierarchy-grid,.registration-grid{grid-template-columns:1fr}.hierarchy-tools .inp{max-width:none;width:100%}}
`;
