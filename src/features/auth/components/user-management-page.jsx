"use client";

import { useCallback, useEffect, useState } from "react";

const ACCOUNT_LABELS = {
  system_owner: "مدير النظام",
  system_manager: "مدير النظام",
  service_coordinator: "منسق الخدمة",
  servant: "خادم",
  main_servant: "منسق الخدمة",
  secretary: "خادم",
};
const emptyForm = () => ({
  email: "", password: "", confirmation: "", fullName: "", phone: "", roleId: "", classIds: [],
  responsibilityIds: [], status: "active",
});
const request = async (path, options) => {
  const response = await fetch(path, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "تعذر تنفيذ الطلب");
  return data;
};
const relation = (value) => Array.isArray(value) ? value[0] : value;
const userRole = (user) => relation(user.user_roles)?.roles;

export function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [options, setOptions] = useState({ roles: [], groups: [], responsibilities: [] });
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [userRows, managementOptions] = await Promise.all([
        request("/api/users"), request("/api/users/options"),
      ]);
      setUsers(userRows);
      setOptions(managementOptions);
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const startCreate = () => {
    const next = emptyForm();
    next.roleId = options.roles.find((role) => role.code === "servant")?.id || "";
    setForm(next); setEditing(null); setMessage(null); setOpen(true);
  };
  const startEdit = (user) => {
    const role = userRole(user);
    const classes = user.user_class_assignments || [];
    const responsibilities = user.user_responsibilities || [];
    setForm({
      email: user.contact_email || "",
      password: "", confirmation: "",
      fullName: user.full_name || "",
      phone: user.phone || "",
      roleId: options.roles.some((item) => item.id === role?.id) ? role.id : "",
      classIds: classes.map((item) => item.group_id),
      responsibilityIds: responsibilities.map((item) => item.responsibility_id),
      status: user.status_code,
    });
    setEditing(user); setMessage(null); setOpen(true);
  };
  const toggle = (key, id) => setForm((current) => ({
    ...current,
    [key]: current[key].includes(id)
      ? current[key].filter((value) => value !== id)
      : [...current[key], id],
  }));

  async function save(event) {
    event.preventDefault(); setSaving(true); setMessage(null);
    try {
      if (editing) {
        await request(`/api/users/${editing.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: form.fullName, phone: form.phone || null,
            status: form.status, roleId: form.roleId,
            classIds: form.classIds, responsibilityIds: form.responsibilityIds,
          }),
        });
        setMessage({ type: "success", text: "تم تحديث الحساب بنجاح." });
      } else {
        if (form.password !== form.confirmation) {
          throw new Error("كلمتا المرور غير متطابقتين.");
        }
        await request("/api/users", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: form.email, password: form.password,
            fullName: form.fullName, phone: form.phone || null,
            roleIds: [form.roleId], classIds: form.classIds,
            responsibilityIds: form.responsibilityIds,
          }),
        });
        setMessage({ type: "success", text: "تم إنشاء الحساب وإرسال دعوة التفعيل." });
      }
      setOpen(false); await load();
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally { setSaving(false); }
  }

  async function changeStatus(user) {
    try {
      await request(`/api/users/${user.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: user.status_code === "active" ? "suspended" : "active" }),
      });
      await load();
    } catch (error) { setMessage({ type: "error", text: error.message }); }
  }

  return <div className="account-management">
    {message && <div className={`alert alert-${message.type}`} role="status">{message.text}</div>}
    <div className="row account-heading">
      <div><h2>إدارة حسابات المستخدمين</h2>
        <p>إدارة نوع الحساب والمسؤوليات والأسر المرتبطة بكل خادم.</p></div>
      <button className="btn btn-primary" onClick={startCreate}>+ إنشاء حساب</button>
    </div>
    <div className="card">
      {loading ? <div className="empty">جارٍ تحميل الحسابات…</div> :
        <div className="tbl-scroll"><table className="tbl"><thead><tr>
          <th>المستخدم</th><th>نوع الحساب</th><th>المسؤوليات</th><th>الأسر</th><th>الحالة</th><th>الإجراءات</th>
        </tr></thead><tbody>{users.map((user) => {
          const role = userRole(user);
          const protectedOwner = role?.code === "system_owner";
          return <tr key={user.id}>
            <td><strong>{user.full_name}</strong><small>{user.contact_email || "—"}</small></td>
            <td><span className="badge badge-indigo">{ACCOUNT_LABELS[role?.code] || role?.name || "—"}</span></td>
            <td>{(user.user_responsibilities || []).map((item) =>
              <span className="badge badge-amber" key={item.responsibility_id}>
                {relation(item.responsibilities)?.name}
              </span>)}
              {!user.user_responsibilities?.length && <span className="badge badge-gray">لا يوجد</span>}</td>
            <td>{(user.user_class_assignments || []).map((item) =>
              <span className="badge badge-gray" key={item.group_id}>{relation(item.groups)?.name}</span>)}
              {!user.user_class_assignments?.length && <span className="badge badge-gray">لا يوجد</span>}</td>
            <td><span className={`badge ${user.status_code === "active" ? "badge-green" : "badge-red"}`}>
              {user.status_code === "active" ? "نشط" : user.status_code}</span></td>
            <td><div className="row">
              <button className="btn btn-xs btn-ghost" disabled={protectedOwner} onClick={() => startEdit(user)}>تعديل</button>
              <button className="btn btn-xs btn-outline" disabled={protectedOwner}
                onClick={() => void changeStatus(user)}>{user.status_code === "active" ? "تعليق" : "تفعيل"}</button>
            </div></td>
          </tr>;
        })}</tbody></table></div>}
    </div>

    {open && <div className="modal-bg" onClick={() => setOpen(false)}>
      <form className="modal modal-lg" onSubmit={save} onClick={(event) => event.stopPropagation()}>
        <div className="modal-header"><h3>{editing ? "تعديل المستخدم" : "إنشاء مستخدم جديد"}</h3>
          <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>×</button></div>
        <div className="modal-body account-form">
          <div className="form-row">
            <label className="form-group"><span className="form-label">الاسم الكامل</span>
              <input className="inp" required minLength={2} value={form.fullName}
                onChange={(event) => setForm({ ...form, fullName: event.target.value })} /></label>
            <label className="form-group"><span className="form-label">البريد الإلكتروني</span>
              <input className="inp" type="email" required disabled={Boolean(editing)} value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
          </div>
          {!editing && <div className="form-row">
            <label className="form-group"><span className="form-label">كلمة المرور الأولية</span>
              <input className="inp" type="password" required minLength={8}
                autoComplete="new-password" value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>
            <label className="form-group"><span className="form-label">تأكيد كلمة المرور</span>
              <input className="inp" type="password" required minLength={8}
                autoComplete="new-password" value={form.confirmation}
                onChange={(event) => setForm({ ...form, confirmation: event.target.value })} /></label>
          </div>}
          <div className="form-row">
            <label className="form-group"><span className="form-label">رقم الهاتف</span>
              <input className="inp" value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
            <label className="form-group"><span className="form-label">نوع الحساب</span>
              <select className="inp" required value={form.roleId}
                onChange={(event) => setForm({ ...form, roleId: event.target.value })}>
                <option value="">اختر نوع الحساب</option>
                {options.roles.map((role) => <option key={role.id} value={role.id}>
                  {ACCOUNT_LABELS[role.code] || role.name}</option>)}
              </select></label>
          </div>
          {editing && <label className="form-group"><span className="form-label">حالة الحساب</span>
            <select className="inp" value={form.status}
              onChange={(event) => setForm({ ...form, status: event.target.value })}>
              <option value="active">نشط</option><option value="suspended">معلق</option><option value="archived">مؤرشف</option>
            </select></label>}
          <ChoiceGroup title="مسؤوليات الخادم" values={options.responsibilities}
            selected={form.responsibilityIds} onToggle={(id) => toggle("responsibilityIds", id)} />
          <ChoiceGroup title="الأسر المكلف بخدمتها" values={options.groups}
            selected={form.classIds} onToggle={(id) => toggle("classIds", id)} />
          {!editing && <p className="management-note">سيُنشأ الحساب نشطًا فورًا دون إرسال دعوة أو طلب تأكيد البريد الإلكتروني.</p>}
        </div>
        <div className="modal-footer"><button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>إلغاء</button>
          <button className="btn btn-primary" disabled={saving}>{saving ? "جارٍ الحفظ…" : "حفظ"}</button></div>
      </form>
    </div>}
  </div>;
}

function ChoiceGroup({ title, values, selected, onToggle }) {
  return <fieldset className="account-choices"><legend>{title}</legend>
    <div>{values.map((item) => <label key={item.id}><input type="checkbox"
      checked={selected.includes(item.id)} onChange={() => onToggle(item.id)} />{item.name}</label>)}
      {!values.length && <p>لا توجد خيارات متاحة.</p>}</div>
  </fieldset>;
}
