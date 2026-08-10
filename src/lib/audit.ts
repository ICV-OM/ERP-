import { query } from "@/lib/db";
import { hashTelemetry } from "@/lib/crypto";

export async function audit(input: {
  organizationId: string;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  requestId?: string | null;
  ip?: string | null;
}) {
  await query(`
    INSERT INTO audit_logs
      (organization_id, actor_user_id, action, entity_type, entity_id, before_json, after_json, request_id, ip_hash)
    VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8,$9)
  `, [
    input.organizationId,
    input.actorUserId,
    input.action,
    input.entityType,
    input.entityId ?? null,
    JSON.stringify(input.before ?? null),
    JSON.stringify(input.after ?? null),
    input.requestId ?? null,
    input.ip ? hashTelemetry(input.ip) : null
  ]);
}
