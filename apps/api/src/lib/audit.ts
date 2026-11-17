import { prisma } from "./prisma.js";

export async function writeAudit(params: {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  meta?: unknown;
}) {
  await prisma.auditLog.create({
    data: {
      actorId: params.actorId ?? null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      metaJson: params.meta ? JSON.stringify(params.meta) : null,
    },
  });
}
