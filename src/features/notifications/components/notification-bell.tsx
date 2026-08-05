"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/infrastructure/supabase/browser-client";
import type { ChurchNotification, NotificationList, NotificationType } from "@/features/notifications/types/notification";
import styles from "./notification-bell.module.css";

const META: Record<NotificationType, { icon: string; label: string }> = {
  INFO: { icon: "ⓘ", label: "معلومة" }, SUCCESS: { icon: "✓", label: "تم بنجاح" },
  WARNING: { icon: "!", label: "تنبيه" }, IMPORTANT: { icon: "★", label: "مهم" },
};
const relativeTime = (value: string) => {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  const formatter = new Intl.RelativeTimeFormat("ar-EG", { numeric: "auto" });
  if (seconds < 60) return formatter.format(-seconds, "second");
  if (seconds < 3600) return formatter.format(-Math.floor(seconds / 60), "minute");
  if (seconds < 86400) return formatter.format(-Math.floor(seconds / 3600), "hour");
  return formatter.format(-Math.floor(seconds / 86400), "day");
};

export function NotificationBell({ userId, canViewAll = false }: { userId: string; canViewAll?: boolean }) {
  const router = useRouter();
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<NotificationList>({ notifications: [], unreadCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewAll, setViewAll] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/notifications${viewAll ? "?scope=all" : ""}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "تعذر تحميل الإشعارات.");
      setState(body); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "تعذر تحميل الإشعارات."); }
    finally { setLoading(false); }
  }, [viewAll]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    const channel = supabase.channel(`notifications:${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications",
        filter: `recipient_user_id=eq.${userId}` }, () => { void load(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load, userId]);
  useEffect(() => {
    const close = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const mark = async (notification: ChurchNotification) => {
    if (viewAll && notification.recipientUserId !== userId) {
      setOpen(false); router.push(notification.targetUrl); return;
    }
    if (!notification.isRead) {
      setState((current) => ({
        unreadCount: Math.max(0, current.unreadCount - 1),
        notifications: current.notifications.map((item) => item.id === notification.id
          ? { ...item, isRead: true, readAt: new Date().toISOString() } : item),
      }));
      await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: notification.id }) });
    }
    setOpen(false); router.push(notification.targetUrl);
  };
  const markAll = async () => {
    setState((current) => ({ unreadCount: 0, notifications: current.notifications.map((item) => ({
      ...item, isRead: true, readAt: item.readAt || new Date().toISOString(),
    })) }));
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }) });
  };

  return <div className={styles.root} ref={root} dir="rtl">
    <button type="button" className={styles.bell} aria-label={`الإشعارات، ${state.unreadCount} غير مقروء`}
      aria-expanded={open} onClick={() => setOpen((value) => !value)}>
      <span aria-hidden="true">🔔</span>
      {state.unreadCount > 0 && <b>{state.unreadCount > 99 ? "+99" : state.unreadCount.toLocaleString("ar-EG")}</b>}
    </button>
    {open && <section className={styles.panel} aria-label="مركز الإشعارات">
      <header><div><strong>مركز الإشعارات</strong><small>{state.unreadCount.toLocaleString("ar-EG")} غير مقروء</small></div>
        <div className={styles.headerActions}>
          {canViewAll && <button type="button" onClick={() => setViewAll((value) => !value)}>{viewAll ? "إشعاراتي" : "كل النظام"}</button>}
          {!viewAll && state.unreadCount > 0 && <button type="button" onClick={() => void markAll()}>تحديد الكل كمقروء</button>}
        </div></header>
      <div className={styles.list}>
        {loading && <p className={styles.state}>جارٍ تحميل الإشعارات…</p>}
        {!loading && error && <button className={styles.retry} onClick={() => void load()}>{error}<small>إعادة المحاولة</small></button>}
        {!loading && !error && state.notifications.length === 0 && <p className={styles.state}>لا توجد إشعارات حتى الآن.</p>}
        {!loading && !error && state.notifications.map((notification) => {
          const meta = META[notification.type];
          return <button type="button" key={notification.id}
            className={`${styles.item} ${styles[notification.type.toLowerCase()]} ${!notification.isRead ? styles.unread : ""}`}
            onClick={() => void mark(notification)}>
            <span className={styles.icon} aria-label={meta.label}>{meta.icon}</span>
            <span className={styles.copy}><strong>{notification.title}</strong><span>{notification.message}</span>
              <small>{relativeTime(notification.createdAt)}</small></span>
            {!notification.isRead && <i aria-label="غير مقروء" />}
          </button>;
        })}
      </div>
    </section>}
  </div>;
}
