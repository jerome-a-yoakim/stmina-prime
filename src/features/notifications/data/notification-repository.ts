import "server-only";

import type { NotificationType } from "@/features/notifications/types/notification";
import { getAdminClient } from "@/infrastructure/supabase/admin-client";

export interface DispatchNotificationInput {
  recipientIds: string[];
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityType: string;
  relatedEntityId: string | null;
  familyId: string | null;
  targetUrl: string;
  createdBy: string | null;
  groupingKey?: string;
  groupedMessage?: string;
}

export async function dispatchNotifications(input: DispatchNotificationInput) {
  const { data, error } = await getAdminClient().rpc("dispatch_notifications", {
    p_recipient_ids: [...new Set(input.recipientIds)],
    p_type: input.type,
    p_title: input.title,
    p_message: input.message,
    p_related_entity_type: input.relatedEntityType,
    p_related_entity_id: input.relatedEntityId,
    p_family_id: input.familyId,
    p_target_url: input.targetUrl,
    p_created_by: input.createdBy,
    p_grouping_key: input.groupingKey || null,
    p_grouped_message: input.groupedMessage || null,
  });
  if (error) throw error;
  return Number(data || 0);
}

export async function familyRecipientIds(familyId: string) {
  const { data, error } = await getAdminClient().rpc("notification_recipients_for_family", {
    p_family_id: familyId,
  });
  if (error) throw error;
  return (data || []) as string[];
}

export async function activeUserIds() {
  const { data, error } = await getAdminClient().from("users").select("id").eq("status_code", "active");
  if (error) throw error;
  return (data || []).map((row) => row.id);
}
