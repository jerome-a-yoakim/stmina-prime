import { getAdminClient } from "@/infrastructure/supabase/admin-client";

export interface AuditInput {
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  beforeData?: unknown;
  afterData?: unknown;
  requestId?: string | null;
  metadata?: Record<string, unknown>;
}

export async function writeAuditLog(input: AuditInput): Promise<void> {
  const admin = getAdminClient();
  const { error } = await admin.from("app_audit_logs").insert({
    actor_user_id: input.actorUserId,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    before_data: input.beforeData ?? null,
    after_data: input.afterData ?? null,
    request_id: input.requestId ?? null,
    metadata: input.metadata ?? {},
  });
  if (error) throw error;
}

export async function listAuditLogs(limit = 100) {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("app_audit_logs")
    .select("id, occurred_at, actor_user_id, action, entity_type, entity_id, metadata")
    .order("occurred_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 500));
  if (error) throw error;
  return data;
}
