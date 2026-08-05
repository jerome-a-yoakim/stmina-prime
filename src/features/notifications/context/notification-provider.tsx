"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  ChurchNotification,
  NotificationList,
} from "@/features/notifications/types/notification";
import { realtimeNotificationManager } from "@/features/notifications/data/realtime-notification-manager";

interface NotificationContextValue {
  notifications: ChurchNotification[];
  unreadCount: number;
  loading: boolean;
  error: string;
  viewAll: boolean;
  setViewAll: (value: boolean | ((prev: boolean) => boolean)) => void;
  load: () => Promise<void>;
  markAsRead: (notification: ChurchNotification) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export function NotificationProvider({
  userId,
  canViewAll = false,
  children,
}: {
  userId: string;
  canViewAll?: boolean;
  children: ReactNode;
}) {
  const [state, setState] = useState<NotificationList>({ notifications: [], unreadCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewAll, setViewAll] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/notifications${viewAll ? "?scope=all" : ""}`, {
        cache: "no-store",
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "تعذر تحميل الإشعارات.");
      setState(body);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر تحميل الإشعارات.");
    } finally {
      setLoading(false);
    }
  }, [viewAll]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  // Connect to canonical Realtime Notification Manager
  useEffect(() => {
    if (!userId) return;

    const unsubscribe = realtimeNotificationManager.subscribe(userId, () => {
      void loadRef.current();
    });

    return () => {
      unsubscribe();
    };
  }, [userId]);

  const markAsRead = async (notification: ChurchNotification) => {
    if (viewAll && notification.recipientUserId !== userId) {
      return;
    }
    if (!notification.isRead) {
      setState((current) => ({
        unreadCount: Math.max(0, current.unreadCount - 1),
        notifications: current.notifications.map((item) =>
          item.id === notification.id
            ? { ...item, isRead: true, readAt: new Date().toISOString() }
            : item
        ),
      }));
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: notification.id }),
      });
    }
  };

  const markAllAsRead = async () => {
    setState((current) => ({
      unreadCount: 0,
      notifications: current.notifications.map((item) => ({
        ...item,
        isRead: true,
        readAt: item.readAt || new Date().toISOString(),
      })),
    }));
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications: state.notifications,
        unreadCount: state.unreadCount,
        loading,
        error,
        viewAll,
        setViewAll,
        load,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
