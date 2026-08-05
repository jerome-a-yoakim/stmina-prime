import React from "react";
import { BackupSnapshot } from "@/features/dashboard/types/dashboard-types";
import { Modal } from "@/features/dashboard/ui/modal";

interface BackupImportModalProps {
  preview: BackupSnapshot;
  busy: boolean;
  onRestore: () => void;
  onClose: () => void;
}

export function BackupImportModal({
  preview,
  busy,
  onRestore,
  onClose,
}: BackupImportModalProps) {
  return (
    <Modal
      title="📂 معاينة ملف الاستيراد"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>
            إلغاء
          </button>
          <button className="btn btn-primary" onClick={onRestore} disabled={busy}>
            {busy ? "⏳ جارٍ الاستعادة..." : "تأكيد الاستعادة"}
          </button>
        </>
      }
    >
      <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>
        تاريخ النسخة: <b>{new Date(preview.ts).toLocaleString("ar-EG")}</b>
      </div>
      <div className="row" style={{ gap: 8, marginBottom: 16 }}>
        <span className="badge badge-blue">{(preview.groups || []).length} أسرة</span>
        <span className="badge badge-green">{(preview.members || []).length} عضو</span>
        <span className="badge badge-indigo">{(preview.subs || []).length} أسبوع</span>
      </div>
      <p style={{ fontSize: 12, color: "#dc2626", fontWeight: 700 }}>
        ⚠️ تنبيه: استعادة هذه النسخة ستستبدل جميع البيانات الحالية في النظام.
      </p>
    </Modal>
  );
}
