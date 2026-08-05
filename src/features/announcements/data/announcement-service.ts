import "server-only";

import { randomUUID } from "crypto";
import { actorHasPermission, requireActiveActor } from "@/features/access-control/data/authorization-service";
import { PermissionDeniedError } from "@/features/access-control/types/access-control";
import { writeAuditLog } from "@/features/audit/data/audit-service";
import { announcementSchema, updateAnnouncementSchema } from "@/features/announcements/schemas/announcement-schema";
import type { Announcement, AnnouncementStatus } from "@/features/announcements/types/announcement";
import { getAdminClient } from "@/infrastructure/supabase/admin-client";
import { notifyAnnouncementEvent } from "@/features/notifications/data/notification-service";

const localDate = () => new Intl.DateTimeFormat("en-CA", {
  timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date());

export const canManageAnnouncements = (actor: Awaited<ReturnType<typeof requireActiveActor>>) =>
  actorHasPermission(actor, "announcements.manage");

const requireManager = async () => {
  const actor = await requireActiveActor();
  if (!canManageAnnouncements(actor)) throw new PermissionDeniedError("announcements.manage");
  return actor;
};

const mapAnnouncement = (row: Record<string, unknown>): Announcement => {
  const endDate = String(row.end_date);
  const storedStatus = String(row.status) as AnnouncementStatus;
  const publisher = row.users as { full_name?: string } | null;
  return {
    id: String(row.id), title: String(row.title), content: String(row.content),
    imageUrl: row.image_url ? String(row.image_url) : null,
    startDate: String(row.start_date), endDate,
    status: storedStatus === "published" && endDate < localDate() ? "expired" : storedStatus,
    createdBy: String(row.created_by), publisherName: publisher?.full_name || "—",
    createdAt: String(row.created_at), publishedAt: row.published_at ? String(row.published_at) : null,
    updatedAt: String(row.updated_at),
  };
};

const SELECT = "id,title,content,image_url,start_date,end_date,status,created_by,created_at,published_at,updated_at,users!announcements_created_by_fkey(full_name)";

export async function listAnnouncements() {
  const actor = await requireActiveActor();
  const manager = canManageAnnouncements(actor);
  const today = localDate();
  let query = getAdminClient().from("announcements").select(SELECT)
    .order("created_at", { ascending: false });
  if (!manager) query = query.eq("status", "published").lte("start_date", today).gte("end_date", today);
  const { data, error } = await query;
  if (error) throw error;
  return { announcements: (data || []).map((row) => mapAnnouncement(row)), canManage: manager };
}

export async function createAnnouncement(input: unknown) {
  const actor = await requireManager();
  const parsed = announcementSchema.parse(input);
  const { data, error } = await getAdminClient().from("announcements").insert({
    title: parsed.title, content: parsed.content, image_url: parsed.imageUrl || null,
    start_date: parsed.startDate, end_date: parsed.endDate, status: parsed.status,
    archived_at: parsed.status === "archived" ? new Date().toISOString() : null,
    created_by: actor.id, updated_by: actor.id,
  }).select(SELECT).single();
  if (error) throw error;
  await writeAuditLog({ actorUserId: actor.id, action: "announcement.created",
    entityType: "announcement", entityId: data.id, afterData: data });
  if (data.status === "published") {
    try {
      await notifyAnnouncementEvent({ actorId: actor.id, actorName: actor.fullName,
        announcementId: data.id, title: data.title, event: "published" });
    } catch { /* Publishing remains successful if notification delivery is temporarily unavailable. */ }
  }
  return mapAnnouncement(data);
}

export async function updateAnnouncement(id: string, input: unknown) {
  const actor = await requireManager();
  const parsed = updateAnnouncementSchema.parse(input);
  const admin = getAdminClient();
  const current = await admin.from("announcements").select("*").eq("id", id).single();
  if (current.error) throw current.error;
  const { data, error } = await admin.from("announcements").update({
    title: parsed.title, content: parsed.content, image_url: parsed.imageUrl || null,
    start_date: parsed.startDate, end_date: parsed.endDate, status: parsed.status,
    archived_at: parsed.status === "archived" ? new Date().toISOString() : null,
    updated_by: actor.id,
  }).eq("id", id).select(SELECT).single();
  if (error) throw error;
  if (current.data.image_url && current.data.image_url !== (parsed.imageUrl || null)) {
    const previousPath = imagePath(current.data.image_url);
    if (previousPath) await admin.storage.from("announcements").remove([previousPath]);
  }
  await writeAuditLog({ actorUserId: actor.id, action: "announcement.updated",
    entityType: "announcement", entityId: id, beforeData: current.data, afterData: data });
  if (data.status === "published") {
    try {
      await notifyAnnouncementEvent({ actorId: actor.id, actorName: actor.fullName,
        announcementId: data.id, title: data.title,
        event: current.data.status === "published" ? "updated" : "published" });
    } catch { /* Updating remains successful if notification delivery is temporarily unavailable. */ }
  }
  return mapAnnouncement(data);
}

const imagePath = (url: string | null) => {
  if (!url) return null;
  const marker = "/storage/v1/object/public/announcements/";
  const position = url.indexOf(marker);
  return position < 0 ? null : decodeURIComponent(url.slice(position + marker.length));
};

export async function deleteAnnouncement(id: string) {
  const actor = await requireManager();
  const admin = getAdminClient();
  const current = await admin.from("announcements").select("*").eq("id", id).single();
  if (current.error) throw current.error;
  const { error } = await admin.from("announcements").delete().eq("id", id);
  if (error) throw error;
  const path = imagePath(current.data.image_url);
  if (path) await admin.storage.from("announcements").remove([path]);
  await writeAuditLog({ actorUserId: actor.id, action: "announcement.deleted",
    entityType: "announcement", entityId: id, beforeData: current.data });
}

export async function uploadAnnouncementImage(file: File) {
  await requireManager();
  const allowed = new Map([["image/jpeg", "jpg"], ["image/png", "png"],
    ["image/webp", "webp"], ["image/gif", "gif"]]);
  const extension = allowed.get(file.type);
  if (!extension) throw new Error("نوع الصورة غير مدعوم.");
  if (file.size > 5 * 1024 * 1024) throw new Error("حجم الصورة يجب ألا يتجاوز 5 ميجابايت.");
  const path = `${new Date().getUTCFullYear()}/${randomUUID()}.${extension}`;
  const admin = getAdminClient();
  const { error } = await admin.storage.from("announcements").upload(path, Buffer.from(await file.arrayBuffer()), {
    contentType: file.type, upsert: false,
  });
  if (error) throw error;
  return { path, url: admin.storage.from("announcements").getPublicUrl(path).data.publicUrl };
}
