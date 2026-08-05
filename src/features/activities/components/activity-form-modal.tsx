import React from "react";
import { Modal } from "@/features/dashboard/ui/modal";

export interface ActivityFormData {
  name: string;
  icon: string;
  color: string;
}

interface ActivityFormModalProps {
  mode: "add" | "edit";
  form: ActivityFormData;
  saving: boolean;
  onChange: (form: ActivityFormData) => void;
  onSave: () => void;
  onClose: () => void;
}

export function ActivityFormModal({
  mode,
  form,
  saving,
  onChange,
  onSave,
  onClose,
}: ActivityFormModalProps) {
  return (
    <Modal
      title={mode === "add" ? "إضافة نشاط جديد" : "تعديل النشاط"}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>
            إلغاء
          </button>
          <button className="btn btn-primary" onClick={onSave} disabled={saving}>
            {saving ? "⏳ جارٍ الحفظ..." : "حفظ"}
          </button>
        </>
      }
    >
      <div className="form-group">
        <label className="form-label">اسم النشاط</label>
        <input
          className="inp"
          placeholder="مثال: كورال، مسرح، كشافة..."
          value={form.name}
          onChange={e => onChange({ ...form, name: e.target.value })}
        />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">الأيقونة</label>
          <input
            className="inp"
            style={{ width: 80 }}
            value={form.icon}
            onChange={e => onChange({ ...form, icon: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label className="form-label">اللون المميز</label>
          <input
            type="color"
            className="inp"
            style={{ width: 80, height: 40, padding: 2 }}
            value={form.color}
            onChange={e => onChange({ ...form, color: e.target.value })}
          />
        </div>
      </div>
    </Modal>
  );
}
