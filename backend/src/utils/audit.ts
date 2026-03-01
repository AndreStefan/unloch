import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';

export type ActorType = 'therapist' | 'patient' | 'system';

export async function logAudit(
  actorId: string,
  actorType: ActorType,
  action: string,
  entityType: string,
  entityId: string,
  metadata?: Record<string, unknown>,
  ipAddress?: string,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId,
        actorType,
        action,
        entityType,
        entityId,
        metadata: (metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        ipAddress: ipAddress ?? null,
      },
    });
  } catch (err) {
    // Audit logging should never crash the request — log and move on
    console.error('Audit log write failed:', err);
  }
}
