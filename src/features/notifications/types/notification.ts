export type NotificationType = "INFO" | "SUCCESS" | "WARNING" | "IMPORTANT";

export interface ChurchNotification {
  id: string;
  recipientUserId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityType: string;
  relatedEntityId: string | null;
  familyId: string | null;
  targetUrl: string;
  createdBy: string | null;
  createdAt: string;
  readAt: string | null;
  isRead: boolean;
  eventCount: number;
}

export interface NotificationList {
  notifications: ChurchNotification[];
  unreadCount: number;
}
