import { prisma } from '../../config/prisma';
import { logAudit } from '../../utils/audit';
import { NotFoundError, BadRequestError } from '../../utils/errors';

export async function createAlert(
  therapistId: string,
  patientId: string,
  ruleId: string | null,
  messageId: string | null,
  level: string,
) {
  const alert = await prisma.alert.create({
    data: {
      therapistId,
      patientId,
      ruleId,
      messageId,
      level,
    },
  });

  await logAudit('system', 'system', 'alert.created', 'alert', alert.id, {
    therapistId,
    patientId,
    ruleId,
    level,
  });

  return alert;
}

export async function getAlerts(
  therapistId: string,
  options: { status?: string; limit?: number; offset?: number } = {},
) {
  const { status, limit = 50, offset = 0 } = options;

  const where: { therapistId: string; status?: string } = { therapistId };
  if (status) where.status = status;

  const [alerts, total] = await Promise.all([
    prisma.alert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        patient: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.alert.count({ where }),
  ]);

  return { alerts, total, limit, offset };
}

export async function resolveAlert(alertId: string, therapistId: string) {
  const alert = await prisma.alert.findUnique({ where: { id: alertId } });

  if (!alert) throw new NotFoundError('Alert not found');
  if (alert.therapistId !== therapistId) throw new BadRequestError('Not your alert', 'NOT_ASSIGNED');
  if (alert.status === 'resolved') throw new BadRequestError('Alert already resolved', 'ALREADY_RESOLVED');

  const updated = await prisma.alert.update({
    where: { id: alertId },
    data: { status: 'resolved', resolvedAt: new Date() },
  });

  await logAudit(therapistId, 'therapist', 'alert.resolved', 'alert', alertId, {
    patientId: alert.patientId,
  });

  return updated;
}
