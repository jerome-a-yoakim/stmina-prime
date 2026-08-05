import React from "react";
import { Modal } from "@/features/dashboard/ui/modal";

export interface GroupFormData {
  name: string;
  mainServant: string;
  assistantServants: string[];
  servantContact: string;
}

interface GroupFormModalProps {
  mode: "add" | "edit";
  form: GroupFormData;
  saving: boolean;
  onChange: (form: GroupFormData) => void;
  onSave: () => void;
  onClose: () => void;
}

export function GroupFormModal({
  mode,
  form,
  saving,
  onChange,
  onSave,
  onClose,
}: GroupFormModalProps) {
  return (
    <Modal
      title={mode === "add" ? "إضافة أسرة جديدة" : "تعديل بيانات الأسرة"}
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
        <label className="form-label">اسم الأسرة</label>
        <input
          className="inp"
          placeholder="مثال: أسرة القديس مارمرقس"
          value={form.name}
          onChange={e => onChange({ ...form, name: e.target.value })}
        />
      </div>
      <div className="form-group">
        <label className="form-label">الخادم الرئيسي</label>
        <input
          className="inp"
          placeholder="اسم الخادم المسؤول"
          value={form.mainServant}
          onChange={e => onChange({ ...form, mainServant: e.target.value })}
        />
      </div>
      <div className="form-group">
        <label className="form-label">رقم تواصل الخادم</label>
        <input
          className="inp"
          placeholder="0123456789"
          value={form.servantContact}
          onChange={e => onChange({ ...form, servantContact: e.target.value })}
        />
      </div>
    </Modal>
  );
}
