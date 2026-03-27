import { db } from "../db/index.server";
import { auditLog } from "../db/schema";

export interface AuditLogParams {
  actionType: string;
  actorId: string;
  targetId?: string;
  targetType?: string;
  description: string;
  metadata?: Record<string, any>;
}

export async function logAction(params: AuditLogParams) {
  try {
    await db.insert(auditLog).values({
      actionType: params.actionType,
      actorId: params.actorId,
      targetId: params.targetId,
      targetType: params.targetType,
      description: params.description,
      metadata: params.metadata,
    });
  } catch (error) {
    console.error("Failed to log audit action:", error);
    throw error;
  }
}
