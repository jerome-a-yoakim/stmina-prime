export type AnnouncementStatus = "draft" | "published" | "archived" | "expired";

export interface Announcement {
  id: string;
  title: string;
  content: string;
  imageUrl: string | null;
  startDate: string;
  endDate: string;
  status: AnnouncementStatus;
  createdBy: string;
  publisherName: string;
  createdAt: string;
  publishedAt: string | null;
  updatedAt: string;
}
