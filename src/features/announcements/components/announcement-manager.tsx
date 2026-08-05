"use client";

import { FormEvent, useMemo, useState } from "react";
import type { Announcement, AnnouncementStatus } from "@/features/announcements/types/announcement";
import styles from "./announcement-manager.module.css";

const STATUS: Record<AnnouncementStatus, string> = {
  draft: "مسودة", published: "منشور", archived: "مؤرشف", expired: "منتهي",
};
const today = () => new Date().toISOString().slice(0, 10);
const blank = () => ({ title: "", content: "", imageUrl: null as string | null,
  startDate: today(), endDate: today(), status: "draft" as "draft" | "published" | "archived" });

export function AnnouncementManager({ initialAnnouncements, canManage }: {
  initialAnnouncements: Announcement[]; canManage: boolean;
}) {
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | AnnouncementStatus>("all");
  const [editing, setEditing] = useState<Announcement | null | false>(false);
  const [form, setForm] = useState(blank);
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const visible = useMemo(() => announcements.filter((announcement) =>
    announcement.title.toLocaleLowerCase("ar").includes(search.trim().toLocaleLowerCase("ar")) &&
    (!canManage || filter === "all" || announcement.status === filter),
  ), [announcements, canManage, filter, search]);

  const reload = async () => {
    const response = await fetch("/api/announcements", { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "تعذر تحميل الإعلانات.");
    setAnnouncements(body.announcements);
  };

  const openCreate = () => { setEditing(null); setForm(blank()); setImage(null); setPreview(false); setError(""); };
  const openEdit = (announcement: Announcement) => {
    setEditing(announcement); setImage(null); setPreview(false); setError("");
    setForm({ title: announcement.title, content: announcement.content, imageUrl: announcement.imageUrl,
      startDate: announcement.startDate, endDate: announcement.endDate,
      status: announcement.status === "expired" ? "published" : announcement.status });
  };

  const save = async (status: "draft" | "published" | "archived") => {
    setSaving(true); setError("");
    try {
      let imageUrl = form.imageUrl;
      if (image) {
        const upload = new FormData(); upload.set("image", image);
        const uploadResponse = await fetch("/api/announcements/image", { method: "POST", body: upload });
        const uploaded = await uploadResponse.json();
        if (!uploadResponse.ok) throw new Error(uploaded.error || "تعذر رفع الصورة.");
        imageUrl = uploaded.url;
      }
      const response = await fetch(editing ? `/api/announcements/${editing.id}` : "/api/announcements", {
        method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, imageUrl, status }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "تعذر حفظ الإعلان.");
      await reload(); setEditing(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "تعذر حفظ الإعلان."); }
    finally { setSaving(false); }
  };

  const submit = (event: FormEvent) => { event.preventDefault(); void save(form.status); };
  const archive = async (announcement: Announcement) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/announcements/${announcement.id}`, { method: "PUT",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({
          title: announcement.title, content: announcement.content, imageUrl: announcement.imageUrl,
          startDate: announcement.startDate, endDate: announcement.endDate, status: "archived",
        }) });
      if (!response.ok) throw new Error((await response.json()).error || "تعذر أرشفة الإعلان.");
      await reload();
    } catch (cause) { alert(cause instanceof Error ? cause.message : "تعذر أرشفة الإعلان."); }
    finally { setSaving(false); }
  };
  const remove = async (announcement: Announcement) => {
    if (!confirm(`حذف الإعلان «${announcement.title}» نهائيًا؟`)) return;
    const response = await fetch(`/api/announcements/${announcement.id}`, { method: "DELETE" });
    if (!response.ok) return alert((await response.json()).error || "تعذر حذف الإعلان.");
    await reload();
  };

  return <div className={styles.manager} dir="rtl">
    <div className={styles.toolbar}>
      <label className={styles.search}>⌕<input value={search} onChange={(event) => setSearch(event.target.value)}
        placeholder="بحث بعنوان الإعلان…" /></label>
      {canManage && <><select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)}>
        <option value="all">كل الحالات</option><option value="published">منشور</option>
        <option value="draft">مسودة</option><option value="archived">مؤرشف</option><option value="expired">منتهي</option>
      </select><button className={styles.primary} onClick={openCreate}>＋ إنشاء إعلان</button></>}
    </div>

    <div className={styles.grid}>{visible.map((announcement) => <article className={styles.card}
      id={`announcement-${announcement.id}`} key={announcement.id}>
      {announcement.imageUrl ? <img src={announcement.imageUrl} alt="" />
        : <div className={styles.placeholder}><span>📣</span></div>}
      <div className={styles.cardBody}>
        <div className={styles.cardTop}><span className={`${styles.status} ${styles[announcement.status]}`}>{STATUS[announcement.status]}</span>
          <small>{formatPeriod(announcement.startDate, announcement.endDate)}</small></div>
        <h2>{announcement.title}</h2><p>{announcement.content}</p>
        <footer><span>بواسطة {announcement.publisherName}</span><span>{formatDate(announcement.publishedAt || announcement.createdAt)}</span></footer>
        {canManage && <div className={styles.actions}><button onClick={() => openEdit(announcement)}>تعديل</button>
          {announcement.status !== "archived" && <button onClick={() => void archive(announcement)}>أرشفة</button>}
          <button className={styles.danger} onClick={() => void remove(announcement)}>حذف</button></div>}
      </div>
    </article>)}</div>
    {!visible.length && <div className={styles.empty}>لا توجد إعلانات مطابقة.</div>}

    {editing !== false && <div className={styles.backdrop} onMouseDown={(event) => event.target === event.currentTarget && setEditing(false)}>
      <form className={styles.dialog} onSubmit={submit}>
        <header><div><small>{editing ? "تعديل الإعلان" : "إعلان جديد"}</small><h2>{preview ? "معاينة الإعلان" : "بيانات الإعلان"}</h2></div>
          <button type="button" onClick={() => setEditing(false)}>×</button></header>
        <div className={styles.dialogTabs}><button type="button" className={!preview ? styles.activeTab : ""} onClick={() => setPreview(false)}>البيانات</button>
          <button type="button" className={preview ? styles.activeTab : ""} onClick={() => setPreview(true)}>المعاينة</button></div>
        {error && <p className={styles.error}>{error}</p>}
        {preview ? <AnnouncementPreview form={form} image={image} /> : <div className={styles.formBody}>
          <label>عنوان الإعلان<input required maxLength={180} value={form.title} onChange={(event) => setForm({ ...form, title:event.target.value })} /></label>
          <fieldset><legend>فترة عرض الإعلان</legend><label>من<input required type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate:event.target.value })} /></label>
            <label>إلى<input required type="date" min={form.startDate} value={form.endDate} onChange={(event) => setForm({ ...form, endDate:event.target.value })} /></label></fieldset>
          <label>محتوى الإعلان<textarea required rows={7} maxLength={10000} value={form.content} onChange={(event) => setForm({ ...form, content:event.target.value })} /></label>
          <label>رفع صورة (اختياري)<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => setImage(event.target.files?.[0] || null)} />
            <small>JPG أو PNG أو WebP أو GIF — بحد أقصى 5 ميجابايت</small></label>
        </div>}
        <footer className={styles.dialogFooter}><button type="button" onClick={() => setEditing(false)}>إلغاء</button>
          <button type="button" disabled={saving} onClick={() => void save("draft")}>حفظ كمسودة</button>
          <button className={styles.primary} type="button" disabled={saving} onClick={() => void save("published")}>{saving ? "جارٍ الحفظ…" : "نشر الإعلان"}</button></footer>
      </form>
    </div>}
  </div>;
}

function AnnouncementPreview({ form, image }: { form: ReturnType<typeof blank>; image: File | null }) {
  const temporary = image ? URL.createObjectURL(image) : form.imageUrl;
  return <div className={styles.preview}>{temporary ? <img src={temporary} alt="معاينة" /> : <div className={styles.placeholder}><span>📣</span></div>}
    <span>{formatPeriod(form.startDate, form.endDate)}</span><h2>{form.title || "عنوان الإعلان"}</h2>
    <p>{form.content || "سيظهر محتوى الإعلان هنا."}</p></div>;
}
const formatDate = (value: string) => new Date(value).toLocaleDateString("ar-EG", { day:"numeric", month:"long", year:"numeric" });
const formatPeriod = (start: string, end: string) => `${new Date(`${start}T12:00:00`).toLocaleDateString("ar-EG")} — ${new Date(`${end}T12:00:00`).toLocaleDateString("ar-EG")}`;
