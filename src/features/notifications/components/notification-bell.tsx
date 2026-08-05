"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useNotifications } from "@/features/notifications/context/notification-provider";
import type { ChurchNotification, NotificationType } from "@/features/notifications/types/notification";
import styles from "./notification-bell.module.css";

const META: Record<NotificationType, { icon: string; label: string }> = {
  INFO: { icon: "ⓘ", label: "معلومة" },
  SUCCESS: { icon: "✓", label: "تم بنجاح" },
  WARNING: { icon: "!", label: "تنبيه" },
  IMPORTANT: { icon: "★", label: "مهم" },
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

  const {
    notifications,
    unreadCount,
    loading,
    error,
    viewAll,
    setViewAll,
    load,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const handleNotificationClick = async (notification: ChurchNotification) => {
    if (viewAll && notification.recipientUserId !== userId) {
      setOpen(false);
      router.push(notification.targetUrl);
      return;
    }
    await markAsRead(notification);
    setOpen(false);
    router.push(notification.targetUrl);
  };

  return (
    <div className={styles.root} ref={root} dir="rtl">
      <button
        type="button"
        className={styles.bell}
        aria-label={`الإشعارات، ${unreadCount} غير مقروء`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden="true">🔔</span>
        {unreadCount > 0 && <b>{unreadCount > 99 ? "+99" : unreadCount.toLocaleString("ar-EG")}</b>}
      </button>

      {open && (
        <section className={styles.panel} aria-label="مركز الإشعارات">
          <header>
            <div>
              <strong>مركز الإشعارات</strong>
              <small>{unreadCount.toLocaleString("ar-EG")} غير مقروء</small>
            </div>
            <div className={styles.headerActions}>
              {canViewAll && (
                <button type="button" onClick={() => setViewAll((value) => !value)}>
                  {viewAll ? "إشعاراتي" : "كل النظام"}
                </button>
              )}
              {!viewAll && unreadCount > 0 && (
                <button type="button" onClick={() => void markAllAsRead()}>
                  تحديد الكل كمقروء
                </button>
              )}
            </div>
          </header>

          <div className={styles.list}>
            {loading && <p className={styles.state}>جارٍ تحميل الإشعارات…</p>}
            {!loading && error && (
              <button className={styles.retry} onClick={() => void load()}>
                {error}
                <small>إعادة المحاولة</small>
              </button>
            )}
            {!loading && !error && notifications.length === 0 && (
              <p className={styles.state}>لا توجد إشعارات حتى الآن.</p>
            )}
            {!loading && !error &&
              notifications.map((notification) => {
                const meta = META[notification.type];
                return (
                  <button
                    type="button"
                    key={notification.id}
                    className={`${styles.item} ${styles[notification.type.toLowerCase()]} ${
                      !notification.isRead ? styles.unread : ""
                    }`}
                    onClick={() => void handleNotificationClick(notification)}
                  >
                    <span className={styles.icon} aria-label={meta.label}>
                      {meta.icon}
                    </span>
                    <span className={styles.copy}>
                      <strong>{notification.title}</strong>
                      <span>{notification.message}</span>
                      <small>{relativeTime(notification.createdAt)}</small>
                    </span>
                    {!notification.isRead && <i aria-label="غير مقروء" />}
                  </button>
                );
              })}
          </div>
        </section>
      )}
    </div>
  );
}
