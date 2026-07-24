import React, { useState } from "react";
import { authService } from "../services/auth-service";
import { auditLogService } from "../services/audit-log-service";
import { ROLE_LABELS, PERMISSION_GROUPS, ROLE_DEFAULT_PERMISSIONS } from "../roles/role-definitions";

export function UserManagementPage({ groups, onUpdate }) {
  const [activeTab, setActiveTab] = useState("users"); // "users" | "audit"
  const [users, setUsers] = useState(() => authService.getUsers());
  const [auditLogs, setAuditLogs] = useState(() => auditLogService.getLogs());
  const [modal, setModal] = useState(null); // { mode: "add"|"edit"|"reset", user?: any }
  const [flash, setFlash] = useState(null);
  const [confirm, setConfirm] = useState(null);

  // Form State
  const [form, setForm] = useState({
    username: "",
    password: "",
    name: "",
    role: "family",
    assignedGroups: [],
    permissions: ROLE_DEFAULT_PERMISSIONS.family,
    enabled: true
  });
  const [resetPwd, setResetPwd] = useState("");

  const refreshData = () => {
    setUsers(authService.getUsers());
    setAuditLogs(auditLogService.getLogs());
    if (onUpdate) onUpdate();
  };

  const showFlash = (type, msg) => {
    setFlash({ type, msg });
    setTimeout(() => setFlash(null), 3000);
  };

  const handleOpenAdd = () => {
    setForm({
      username: "",
      password: "",
      name: "",
      role: "family",
      assignedGroups: [],
      permissions: [...ROLE_DEFAULT_PERMISSIONS.family],
      enabled: true
    });
    setModal({ mode: "add" });
  };

  const handleOpenEdit = (user) => {
    setForm({
      username: user.username,
      password: "",
      name: user.name,
      role: user.role,
      assignedGroups: user.assignedGroups || [],
      permissions: user.permissions || ROLE_DEFAULT_PERMISSIONS[user.role] || [],
      enabled: user.enabled !== undefined ? user.enabled : true
    });
    setModal({ mode: "edit", user });
  };

  const handleOpenReset = (user) => {
    setResetPwd("");
    setModal({ mode: "reset", user });
  };

  const handleRoleChange = (newRole) => {
    setForm(p => ({
      ...p,
      role: newRole,
      permissions: [...(ROLE_DEFAULT_PERMISSIONS[newRole] || [])]
    }));
  };

  const handleTogglePermission = (permKey) => {
    setForm(p => {
      const current = p.permissions || [];
      const exists = current.includes(permKey);
      return {
        ...p,
        permissions: exists ? current.filter(x => x !== permKey) : [...current, permKey]
      };
    });
  };

  const handleToggleGroup = (groupName) => {
    setForm(p => {
      const current = p.assignedGroups || [];
      const exists = current.includes(groupName);
      return {
        ...p,
        assignedGroups: exists ? current.filter(x => x !== groupName) : [...current, groupName]
      };
    });
  };

  const handleSave = () => {
    if (!form.username.trim() || !form.name.trim()) {
      return showFlash("error", "اسم المستخدم والاسم الكامل مطلوبان");
    }

    if (modal.mode === "add") {
      if (!form.password) {
        return showFlash("error", "كلمة المرور مطلوبة عند إنشاء حساب جديد");
      }
      const res = authService.createUser(form);
      if (!res.success) return showFlash("error", res.error);
      showFlash("success", "✅ تم إنشاء الحساب بنجاح");
    } else if (modal.mode === "edit") {
      const payload = {
        username: form.username,
        name: form.name,
        role: form.role,
        assignedGroups: form.assignedGroups,
        permissions: form.permissions,
        enabled: form.enabled
      };
      if (form.password.trim()) {
        payload.password = form.password.trim();
      }
      const res = authService.updateUser(modal.user.id, payload);
      if (!res.success) return showFlash("error", res.error);
      showFlash("success", "✅ تم تحديث بيانات الحساب بنجاح");
    }
    refreshData();
    setModal(null);
  };

  const handleSaveResetPassword = () => {
    if (!resetPwd.trim()) return showFlash("error", "يرجى إدخال كلمة المرور الجديدة");
    const res = authService.resetPassword(modal.user.id, resetPwd.trim());
    if (!res.success) return showFlash("error", res.error);
    showFlash("success", "✅ تم تغيير كلمة المرور بنجاح");
    refreshData();
    setModal(null);
  };

  const handleToggleStatus = (user) => {
    const res = authService.toggleEnabled(user.id);
    if (!res.success) return showFlash("error", res.error);
    showFlash("success", res.enabled ? "✅ تم تفعيل الحساب" : "⚠️ تم تعطيل الحساب");
    refreshData();
  };

  const handleSoftDelete = (user) => {
    const res = authService.softDeleteUser(user.id);
    if (!res.success) return showFlash("error", res.error);
    showFlash("success", "📦 تم حذف الحساب مؤقتاً (Soft Delete)");
    refreshData();
    setConfirm(null);
  };

  return (
    <div>
      {flash && <div className={`alert alert-${flash.type}`}>{flash.msg}</div>}

      <div className="tabs" style={{ marginBottom: 18 }}>
        <button className={`tab ${activeTab === "users" ? "active" : ""}`} onClick={() => setActiveTab("users")}>
          🔐 إدارة الحسابات ({users.length})
        </button>
        <button className={`tab ${activeTab === "audit" ? "active" : ""}`} onClick={() => { setActiveTab("audit"); setAuditLogs(auditLogService.getLogs()); }}>
          📋 سجل التدقيق والتغييرات ({auditLogs.length})
        </button>
      </div>

      {activeTab === "users" && (
        <>
          <div className="row" style={{ marginBottom: 16, justifyContent: "space-between" }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: "#1E1B4B" }}>إدارة حسابات المستخدمين</h3>
              <p style={{ fontSize: 12, color: "#6B7280" }}>تحديد أدوار الخدام وحسابات الأسر والتحكم بدقة في الصلاحيات الممنوحة.</p>
            </div>
            <button className="btn btn-primary" onClick={handleOpenAdd}>+ إنشاء حساب جديد</button>
          </div>

          <div className="card">
            <div className="tbl-scroll">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>المستخدم</th>
                    <th>اسم الحساب (Username)</th>
                    <th>الدور (Role)</th>
                    <th>الأسر المعينة (Assigned Families)</th>
                    <th>الحالة</th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td>
                        <div style={{ fontWeight: 800, color: "#111827" }}>{u.name}</div>
                        <div style={{ fontSize: 11, color: "#6B7280" }}>أنشئ في: {new Date(u.createdAt || Date.now()).toLocaleDateString("ar-EG")}</div>
                      </td>
                      <td><code style={{ background: "#FFF5F2", color: "#E73F1E", padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>{u.username}</code></td>
                      <td>
                        <span className={`badge ${u.role === "admin" ? "badge-red" : "badge-indigo"}`}>
                          {ROLE_LABELS[u.role] || u.role}
                        </span>
                      </td>
                      <td>
                        {u.role === "admin" ? (
                          <span className="badge badge-gray">جميع الأسر (وصول كامل)</span>
                        ) : (u.assignedGroups || []).length > 0 ? (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {u.assignedGroups.map(g => (
                              <span key={g} className="badge badge-amber">{g.replace("أسرة", "").trim()}</span>
                            ))}
                          </div>
                        ) : (
                          <span className="badge badge-gray">غير معين لأسرة</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${u.enabled ? "badge-green" : "badge-red"}`}>
                          {u.enabled ? "نشط ✓" : "معطل ✕"}
                        </span>
                      </td>
                      <td>
                        <div className="row" style={{ gap: 4 }}>
                          <button className="btn btn-xs btn-ghost" onClick={() => handleOpenEdit(u)}>✏️ تعديل</button>
                          <button className="btn btn-xs btn-outline" onClick={() => handleOpenReset(u)}>🔑 كلمة المرور</button>
                          {u.username !== "admin" && (
                            <>
                              <button
                                className={`btn btn-xs ${u.enabled ? "btn-amber" : "btn-success"}`}
                                onClick={() => handleToggleStatus(u)}
                              >
                                {u.enabled ? "تعطيل 🔒" : "تفعيل 🔓"}
                              </button>
                              <button
                                className="btn btn-xs btn-danger"
                                onClick={() => setConfirm({ msg: `هل أنت تأكد من نقل حساب "${u.name}" للمحذوفات؟`, onYes: () => handleSoftDelete(u) })}
                              >
                                🗑 حذف مؤقت
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === "audit" && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: "#1E1B4B" }}>📋 سجل التدقيق والعمليات الإدارية (Audit Trail)</h3>
            <p style={{ fontSize: 12, color: "#6B7280" }}>تتبع جميع العمليات والتغييرات التي تمت على الحسابات والصلاحيات.</p>
          </div>

          <div className="card">
            {!auditLogs.length ? (
              <div className="empty"><div className="ei">📋</div>لا توجد سجلات تدقيق حالية</div>
            ) : (
              <div className="tbl-scroll">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>التاريخ والتوقيت</th>
                      <th>نوع الإجراء</th>
                      <th>القائم بالعملية</th>
                      <th>الحساب المستهدف</th>
                      <th>تفاصيل العمل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map(log => (
                      <tr key={log.id}>
                        <td style={{ whiteSpace: "nowrap", fontSize: 11, color: "#6B7280" }}>
                          {new Date(log.timestamp).toLocaleString("ar-EG")}
                        </td>
                        <td>
                          <span className="badge badge-indigo" style={{ fontWeight: 800 }}>{log.action}</span>
                        </td>
                        <td style={{ fontWeight: 700, color: "#111827" }}>{log.performedBy}</td>
                        <td>{log.targetUser ? <code style={{ background: "#FFF5F2", color: "#E73F1E", padding: "2px 6px", borderRadius: 4 }}>{log.targetUser}</code> : "—"}</td>
                        <td style={{ fontSize: 12, color: "#374151" }}>{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE / EDIT MODAL WITH CATEGORIZED PERMISSIONS */}
      {modal && (modal.mode === "add" || modal.mode === "edit") && (
        <div className="modal-bg" onClick={() => setModal(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{modal.mode === "add" ? "➕ إنشاء حساب جديد" : "✏️ تعديل الحساب والصلاحيات"}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">الاسم الكامل / المسمى</label>
                  <input className="inp" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="مثال: خادم أسرة مارمينا" />
                </div>
                <div className="form-group">
                  <label className="form-label">اسم المستخدم (Username)</label>
                  <input className="inp" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} placeholder="اسم الحساب للتسجيل" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">كلمة المرور {modal.mode === "edit" && "(اتركها فارغة لعدم التغيير)"}</label>
                  <input className="inp" type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="كلمة المرور" />
                </div>
                <div className="form-group">
                  <label className="form-label">الدور الأساسي (Role)</label>
                  <select className="inp" value={form.role} onChange={e => handleRoleChange(e.target.value)}>
                    {Object.entries(ROLE_LABELS).map(([rKey, rLabel]) => (
                      <option key={rKey} value={rKey}>{rLabel}</option>
                    ))}
                  </select>
                </div>
              </div>

              {form.role !== "admin" && (
                <>
                  <div className="divider" />
                  <div className="form-group">
                    <label className="form-label">🎯 الأسر المخصصة للحساب (Family Assignment)</label>
                    <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 8 }}>
                      رؤية الحساب مقتصرة حصرياً على البيانات والأعضاء المقيدين في هذه الأسر.
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8, padding: 12, border: "1px solid #F2E8E4", borderRadius: 10, background: "#FFF9F7" }}>
                      {groups.filter(g => g.active).map(g => {
                        const checked = (form.assignedGroups || []).includes(g.name);
                        return (
                          <label key={g.id} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
                            <input type="checkbox" checked={checked} onChange={() => handleToggleGroup(g.name)} />
                            <span>{g.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="divider" />
                  <div className="form-group">
                    <label className="form-label">🔑 الصلاحيات التفصيلية مقسمة لفئات (Grouped Permissions)</label>
                    <div className="col" style={{ gap: 14 }}>
                      {Object.entries(PERMISSION_GROUPS).map(([category, perms]) => (
                        <div key={category} style={{ border: "1px solid #F2E8E4", borderRadius: 10, padding: 12, background: "#ffffff" }}>
                          <div style={{ fontSize: 12, fontWeight: 800, color: "#E73F1E", marginBottom: 8, borderBottom: "1px solid #F2E8E4", paddingBottom: 4 }}>
                            📁 فئة {category}
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
                            {perms.map(pObj => {
                              const checked = (form.permissions || []).includes(pObj.key);
                              return (
                                <label key={pObj.key} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12, fontWeight: 600, padding: "4px 8px", background: checked ? "#FFF5F2" : "transparent", borderRadius: 6, border: checked ? "1px solid #FFE0B2" : "1px solid transparent" }}>
                                  <input type="checkbox" checked={checked} onChange={() => handleTogglePermission(pObj.key)} />
                                  <span style={{ color: checked ? "#E73F1E" : "#374151" }}>{pObj.label}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>إلغاء</button>
              <button className="btn btn-primary" onClick={handleSave}>حفظ الحساب</button>
            </div>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {modal && modal.mode === "reset" && (
        <div className="modal-bg" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🔑 تعيين كلمة مرور جديدة للحساب</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13, color: "#374151", marginBottom: 14 }}>
                تعيين كلمة مرور جديدة للحساب: <b>{modal.user.name} ({modal.user.username})</b>
              </p>
              <div className="form-group">
                <label className="form-label">كلمة المرور الجديدة</label>
                <input className="inp" type="password" value={resetPwd} onChange={e => setResetPwd(e.target.value)} placeholder="أدخل كلمة المرور الجديدة" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>إلغاء</button>
              <button className="btn btn-primary" onClick={handleSaveResetPassword}>تحديث كلمة المرور</button>
            </div>
          </div>
        </div>
      )}

      {confirm && (
        <div className="modal-bg" onClick={() => setConfirm(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>تأكيد حذف الحساب المؤقت (Soft Delete)</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setConfirm(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 14, color: "#111827" }}>{confirm.msg}</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setConfirm(null)}>إلغاء</button>
              <button className="btn btn-danger" onClick={confirm.onYes}>تأكيد الحذف المؤقت</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
