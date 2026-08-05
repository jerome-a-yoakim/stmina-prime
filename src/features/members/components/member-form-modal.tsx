import React from "react";
import { Modal } from "@/features/dashboard/ui/modal";
import { LegacyGroup } from "@/features/dashboard/types/dashboard-types";

interface MemberFormModalProps {
  mode: "add" | "edit";
  name: string;
  groupId: string;
  groups: LegacyGroup[];
  saving: boolean;
  onNameChange: (name: string) => void;
  onGroupChange: (groupId: string) => void;
  onSave: () => void;
  onClose: () => void;
}

export function MemberFormModal({
  mode,
  name,
  groupId,
  groups,
  saving,
  onNameChange,
  onGroupChange,
  onSave,
  onClose,
}: MemberFormModalProps) {
  return (
    <Modal
      title={mode === "add" ? "إضافة عضو جديد" : "تعديل بيانات العضو"}
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
        <label className="form-label">الاسم الكامل</label>
        <input
          className="inp"
          placeholder="أدخل الاسم الكامل"
          value={name}
          onChange={e => onNameChange(e.target.value)}
        />
      </div>
      <div className="form-group">
        <label className="form-label">الأسرة</label>
        <select
          className="inp"
          value={groupId}
          onChange={e => onGroupChange(e.target.value)}
        >
          {groups
            .filter(g => g.active)
            .map(g => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
        </select>
      </div>
    </Modal>
  );
}
