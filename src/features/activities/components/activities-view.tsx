import React, { useState } from "react";
import { createActivity, deleteActivity, updateActivity } from "@/features/activities/data/activity-service";
import { ActivityFormData, ActivityFormModal } from "./activity-form-modal";
import { ActivityItem, LegacyMember } from "@/features/dashboard/types/dashboard-types";
import { Alert } from "@/features/dashboard/ui/alert";
import { Confirm } from "@/features/dashboard/ui/confirm-dialog";
import { ProgBar } from "@/features/dashboard/ui/progress-bar";

interface ActivitiesPageProps {
  activities: ActivityItem[];
  members: LegacyMember[];
  onUpdate: () => Promise<void>;
}

export function ActivitiesPage({ activities, members, onUpdate }: ActivitiesPageProps) {
  const [actModal, setActModal] = useState<{ mode: "add" | "edit"; act?: ActivityItem } | null>(null);
  const [form, setForm] = useState<ActivityFormData>({ name: "", icon: "🎯", color: "#6366f1" });
  const [flash, setFlash] = useState<{ type: string; msg: string } | null>(null);
  const [confirm, setConfirm] = useState<{ msg: string; onYes: () => void } | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  const showFlash = (type: string, msg: string) => {
    setFlash({ type, msg });
    setTimeout(() => setFlash(null), 3000);
  };

  const saveActivity = async () => {
    if (!form.name.trim()) return showFlash("error", "الاسم مطلوب");
    setSaving(true);
    try {
      if (actModal?.mode === "add") {
        await createActivity({ name: form.name.trim(), icon: form.icon, color: form.color });
        showFlash("success", "✅ تم إضافة النشاط");
      } else if (actModal?.act) {
        await updateActivity(actModal.act.id, { name: form.name.trim(), icon: form.icon, color: form.color });
        showFlash("success", "✅ تم تحديث النشاط");
      }
      await onUpdate();
      setActModal(null);
    } catch (e: any) {
      showFlash("error", `فشل حفظ النشاط: ${e.message || "خطأ غير متوقع"}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteActivity = async (act: ActivityItem) => {
    try {
      await deleteActivity(act.id);
      await onUpdate();
      showFlash("success", "🗑 تم حذف النشاط");
    } catch (e: any) {
      showFlash("error", `فشل حذف النشاط: ${e.message || "خطأ غير متوقع"}`);
    } finally {
      setConfirm(null);
    }
  };

  return (
    <div>
      {flash && <Alert type={flash.type}>{flash.msg}</Alert>}
      <div className="row" style={{ marginBottom: 16 }}>
        <button
          className="btn btn-primary"
          onClick={() => {
            setForm({ name: "", icon: "🎯", color: "#6366f1" });
            setActModal({ mode: "add" });
          }}
        >
          + إضافة نشاط
        </button>
      </div>

      <div className="grid-3" style={{ marginBottom: 20 }}>
        {activities.map(act => {
          const count = members.filter(m => m.active && (m.activities || []).includes(act.id)).length;
          const activeCount = members.filter(m => m.active).length;
          return (
            <div key={act.id} className="kpi-card" style={{ borderTop: `4px solid ${act.color}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 28, marginBottom: 4 }}>{act.icon}</div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: "var(--text)" }}>{act.name}</div>
                  <div className="kpi-sub">{count} عضو مشارك</div>
                  <ProgBar
                    pct={activeCount ? Math.round((count / activeCount) * 100) : 0}
                    color={act.color}
                  />
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <button
                    className="btn btn-xs btn-ghost"
                    onClick={() => {
                      setForm({ name: act.name, icon: act.icon, color: act.color });
                      setActModal({ mode: "edit", act });
                    }}
                  >
                    ✏️
                  </button>
                  <button
                    className="btn btn-xs"
                    style={{ background: "#fee2e2", color: "#991b1b", border: "none" }}
                    onClick={() =>
                      setConfirm({
                        msg: `حذف نشاط "${act.name}"؟`,
                        onYes: () => handleDeleteActivity(act),
                      })
                    }
                  >
                    🗑
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card">
        <div className="card-header">
          <h3>👥 الأعضاء حسب النشاط</h3>
        </div>
        <div className="card-body">
          {activities.map(act => {
            const actMembers = members.filter(m => m.active && (m.activities || []).includes(act.id));
            return (
              <div key={act.id} style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: act.color, marginBottom: 8 }}>
                  {act.icon} {act.name}{" "}
                  <span className="badge badge-indigo" style={{ marginRight: 8 }}>
                    {actMembers.length}
                  </span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {actMembers.map(m => (
                    <span key={m.id} className="badge badge-gray">
                      {m.name}
                    </span>
                  ))}
                  {!actMembers.length && (
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>لا يوجد أعضاء</span>
                  )}
                </div>
                <div className="divider" />
              </div>
            );
          })}
        </div>
      </div>

      {actModal && (
        <ActivityFormModal
          mode={actModal.mode}
          form={form}
          saving={saving}
          onChange={setForm}
          onSave={saveActivity}
          onClose={() => setActModal(null)}
        />
      )}
      {confirm && <Confirm msg={confirm.msg} onYes={confirm.onYes} onNo={() => setConfirm(null)} />}
    </div>
  );
}
