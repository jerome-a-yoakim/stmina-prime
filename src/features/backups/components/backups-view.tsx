import React, { useState } from "react";
import { exportSnapshot, restoreSnapshot, validateSnapshot } from "@/features/backups/data/backup-service";
import { BackupImportModal } from "./backup-import-modal";
import { BackupSnapshot } from "@/features/dashboard/types/dashboard-types";
import { Alert } from "@/features/dashboard/ui/alert";
import { Confirm } from "@/features/dashboard/ui/confirm-dialog";
import { readLocalPref, writeLocalPref } from "@/features/dashboard/utils/local-storage-prefs";

interface BackupsPageProps {
  systemProfileId: string | null;
}

export function BackupsPage({ systemProfileId }: BackupsPageProps) {
  const BACKUPS_KEY = "church_backups";
  const [backups, setBackups] = useState<BackupSnapshot[]>(() => readLocalPref(BACKUPS_KEY, []));
  const [flash, setFlash] = useState<{ type: string; msg: string } | null>(null);
  const [confirm, setConfirm] = useState<{ msg: string; onYes: () => void } | null>(null);
  const [importPreview, setImportPreview] = useState<BackupSnapshot | null>(null);
  const [busy, setBusy] = useState<boolean>(false);

  const refresh = () => setBackups(readLocalPref(BACKUPS_KEY, []));
  const showFlash = (type: string, msg: string) => {
    setFlash({ type, msg });
    setTimeout(() => setFlash(null), 3000);
  };

  const doBackup = async () => {
    setBusy(true);
    try {
      const snapshot = await exportSnapshot();
      const all = [snapshot, ...readLocalPref(BACKUPS_KEY, [])].slice(0, 10);
      writeLocalPref(BACKUPS_KEY, all);
      refresh();
      showFlash("success", "✅ تم إنشاء نسخة احتياطية");
    } catch (e: any) {
      showFlash("error", `فشل إنشاء نسخة احتياطية: ${e.message || "خطأ غير متوقع"}`);
    } finally {
      setBusy(false);
    }
  };

  const doRestore = async (snap: BackupSnapshot) => {
    setBusy(true);
    try {
      await restoreSnapshot(snap as any, systemProfileId || "");
      showFlash("success", "✅ تم الاستعادة. جاري إعادة التحميل...");
      setConfirm(null);
      setTimeout(() => window.location.reload(), 1800);
    } catch (e: any) {
      showFlash("error", `فشلت الاستعادة: ${e.message || "خطأ غير متوقع"}`);
      setConfirm(null);
      setBusy(false);
    }
  };

  const exportBackup = (snap: BackupSnapshot) => {
    const blob = new Blob([JSON.stringify(snap, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backup_${snap.ts.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = ev => {
      try {
        const snap = validateSnapshot(JSON.parse(ev.target?.result as string));
        setImportPreview(snap);
      } catch (error: any) {
        showFlash("error", error.message || "خطأ في قراءة الملف");
      }
    };
    r.readAsText(file);
    e.target.value = "";
  };

  return (
    <div>
      {flash && <Alert type={flash.type}>{flash.msg}</Alert>}

      <div className="row" style={{ marginBottom: 16, gap: 10 }}>
        <button className="btn btn-primary" onClick={doBackup} disabled={busy}>
          {busy ? "⏳ جارٍ التنفيذ..." : "💾 نسخة احتياطية الآن"}
        </button>
        <label className="btn btn-ghost" style={{ cursor: "pointer" }}>
          📂 استيراد JSON
          <input
            type="file"
            accept=".json"
            style={{ display: "none" }}
            onChange={importJSON}
            disabled={busy}
          />
        </label>
      </div>

      {importPreview && (
        <BackupImportModal
          preview={importPreview}
          busy={busy}
          onRestore={() =>
            setConfirm({
              msg: "استعادة من هذا الملف؟ ستُستبدل جميع البيانات.",
              onYes: () => doRestore(importPreview),
            })
          }
          onClose={() => setImportPreview(null)}
        />
      )}

      <div className="card">
        <div className="card-header">
          <h3>النسخ الاحتياطية</h3>
          <span className="badge badge-indigo">{backups.length}/10</span>
        </div>
        {!backups.length ? (
          <div className="empty">
            <div className="ei">💾</div>لا توجد نسخ
          </div>
        ) : (
          backups.map((b, i) => (
            <div key={i} className="history-row">
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>
                  {new Date(b.ts).toLocaleString("ar-EG")}
                </div>
                <div className="row" style={{ marginTop: 4, gap: 6 }}>
                  <span className="badge badge-blue">{(b.groups || []).length} أسرة</span>
                  <span className="badge badge-green">{(b.members || []).length} عضو</span>
                  <span className="badge badge-indigo">{(b.subs || []).length} أسبوع</span>
                </div>
              </div>
              <div className="row">
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={busy}
                  onClick={() => exportBackup(b)}
                >
                  ⬇ تحميل
                </button>
                <button
                  className="btn btn-amber btn-sm"
                  disabled={busy}
                  onClick={() =>
                    setConfirm({
                      msg: `استعادة النسخة: ${new Date(b.ts).toLocaleString("ar-EG")}؟`,
                      onYes: () => doRestore(b),
                    })
                  }
                >
                  ↩ استعادة
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      {confirm && (
        <Confirm msg={confirm.msg} onYes={confirm.onYes} onNo={() => setConfirm(null)} />
      )}
    </div>
  );
}
