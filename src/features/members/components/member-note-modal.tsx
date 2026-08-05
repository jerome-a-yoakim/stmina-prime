import React from "react";

export interface NoteFormData {
  title: string;
  content: string;
  category: string;
  isImportant: boolean;
}

interface MemberNoteModalProps {
  mode: "add" | "edit";
  form: NoteFormData;
  onChange: (form: NoteFormData) => void;
  onSave: () => void;
  onClose: () => void;
}

export function MemberNoteModal({
  mode,
  form,
  onChange,
  onSave,
  onClose,
}: MemberNoteModalProps) {
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{mode === "add" ? "➕ إضافة ملاحظة متابعة جديدة" : "✏️ تعديل الملاحظة"}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">عنوان الملاحظة</label>
            <input
              className="inp"
              placeholder="عنوان مختصر للملاحظة"
              value={form.title}
              onChange={e => onChange({ ...form, title: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">تصنيف الملاحظة</label>
            <select
              className="inp"
              value={form.category}
              onChange={e => onChange({ ...form, category: e.target.value })}
            >
              <option value="General">عامة (General)</option>
              <option value="Spiritual">روحية (Spiritual)</option>
              <option value="Follow-up">متابعة (Follow-up)</option>
              <option value="Family">عائلية (Family)</option>
              <option value="Health">صحية (Health)</option>
              <option value="Education">تعليمية (Education)</option>
              <option value="Other">أخرى (Other)</option>
            </select>
          </div>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={form.isImportant}
              onChange={e => onChange({ ...form, isImportant: e.target.checked })}
            />
            <span>ملاحظة مهمة</span>
          </label>
          <div className="form-group">
            <label className="form-label">تفاصيل الملاحظة</label>
            <textarea
              className="inp"
              style={{ minHeight: 100 }}
              placeholder="اكتب تفاصيل الافتقاد والملاحظة..."
              value={form.content}
              onChange={e => onChange({ ...form, content: e.target.value })}
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>
            إلغاء
          </button>
          <button className="btn btn-primary" onClick={onSave}>
            حفظ الملاحظة
          </button>
        </div>
      </div>
    </div>
  );
}
