import { prisma } from '../../config/prisma';
import { NotFoundError } from '../../utils/errors';
import { Prisma } from '@prisma/client';

// ── Comprehensive Audit Actions ──
export const AUDIT_ACTIONS = {
  // Auth
  AUTH_LOGIN: 'auth.login',
  AUTH_LOGOUT: 'auth.logout',
  AUTH_MFA_SETUP: 'auth.mfa.setup',
  AUTH_MFA_VERIFY: 'auth.mfa.verify',
  AUTH_REFRESH: 'auth.refresh',
  AUTH_PATIENT_LOGIN: 'auth.patient.login',
  AUTH_PATIENT_VERIFY: 'auth.patient.verify',

  // Rules
  RULE_CREATE: 'rule.create',
  RULE_UPDATE: 'rule.update',
  RULE_DEACTIVATE: 'rule.deactivate',
  RULE_TEST: 'rule.test',

  // Messages
  MESSAGE_SEND: 'message.send',
  MESSAGE_RECEIVE: 'message.receive',
  MESSAGE_RULE_MATCH: 'message.rule_match',

  // Crisis
  CRISIS_DETECT: 'crisis.detect',
  CRISIS_CLEAR: 'crisis.clear',
  CRISIS_DETECT_WS: 'crisis.detected.ws',

  // Briefings
  BRIEFING_GENERATE: 'briefing.generated',
  BRIEFING_VIEW: 'briefing.view',

  // Patient management
  PATIENT_CONSENT: 'patient.consent',
  PATIENT_REVOKE: 'patient.revoke',
  PATIENT_PAUSE: 'patient.pause',
  PATIENT_EXPORT: 'patient.data_export',

  // Alerts
  ALERT_CREATE: 'alert.create',
  ALERT_RESOLVE: 'alert.resolve',

  // Audit
  AUDIT_VIEW: 'audit.view',
  AUDIT_EXPORT: 'audit.export',
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

/**
 * Get audit trail for a specific patient.
 * Returns all audit entries related to this patient (as entity or in metadata).
 */
export async function getPatientAuditTrail(
  patientId: string,
  therapistId: string,
  options: {
    limit?: number;
    offset?: number;
    action?: string;
    startDate?: Date;
    endDate?: Date;
  } = {}
) {
  const { limit = 50, offset = 0, action, startDate, endDate } = options;

  // Verify patient belongs to therapist
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, therapistId },
  });

  if (!patient) {
    throw new NotFoundError('Patient not found or not assigned to you');
  }

  const where: Prisma.AuditLogWhereInput = {
    OR: [
      { entityId: patientId },
      { actorId: patientId },
    ],
    ...(action && { action }),
    ...(startDate || endDate
      ? {
          createdAt: {
            ...(startDate && { gte: startDate }),
            ...(endDate && { lte: endDate }),
          },
        }
      : {}),
  };

  const [entries, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { entries, total, limit, offset };
}

/**
 * Get practice-level audit log (all entries for all patients/therapists in a practice).
 */
export async function getPracticeAuditLog(
  therapistId: string,
  options: {
    limit?: number;
    offset?: number;
    action?: string;
    actorType?: string;
    startDate?: Date;
    endDate?: Date;
  } = {}
) {
  const { limit = 50, offset = 0, action, actorType, startDate, endDate } = options;

  // Get therapist's practice to scope the query
  const therapist = await prisma.therapist.findUnique({
    where: { id: therapistId },
    select: { practiceId: true },
  });

  if (!therapist) {
    throw new NotFoundError('Therapist not found');
  }

  // Get all therapist IDs in this practice
  const practiceTherapists = await prisma.therapist.findMany({
    where: { practiceId: therapist.practiceId },
    select: { id: true },
  });
  const therapistIds = practiceTherapists.map((t) => t.id);

  // Get all patient IDs for those therapists
  const practicePatients = await prisma.patient.findMany({
    where: { therapistId: { in: therapistIds } },
    select: { id: true },
  });
  const patientIds = practicePatients.map((p) => p.id);

  const allActorIds = [...therapistIds, ...patientIds, 'system'];

  const where: Prisma.AuditLogWhereInput = {
    actorId: { in: allActorIds },
    ...(action && { action }),
    ...(actorType && { actorType }),
    ...(startDate || endDate
      ? {
          createdAt: {
            ...(startDate && { gte: startDate }),
            ...(endDate && { lte: endDate }),
          },
        }
      : {}),
  };

  const [entries, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { entries, total, limit, offset };
}

/**
 * Export patient audit trail as structured JSON.
 */
export async function exportPatientAuditTrail(
  patientId: string,
  therapistId: string,
  format: 'json' | 'csv' = 'json'
) {
  // Verify patient belongs to therapist
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, therapistId },
  });

  if (!patient) {
    throw new NotFoundError('Patient not found or not assigned to you');
  }

  const entries = await prisma.auditLog.findMany({
    where: {
      OR: [
        { entityId: patientId },
        { actorId: patientId },
      ],
    },
    orderBy: { createdAt: 'asc' },
  });

  if (format === 'csv') {
    const headers = 'id,actor_id,actor_type,action,entity_type,entity_id,ip_address,created_at,metadata';
    const rows = entries.map((e) =>
      [
        e.id,
        e.actorId,
        e.actorType,
        e.action,
        e.entityType,
        e.entityId,
        e.ipAddress ?? '',
        e.createdAt.toISOString(),
        e.metadata ? JSON.stringify(e.metadata).replace(/"/g, '""') : '',
      ]
        .map((v) => `"${v}"`)
        .join(',')
    );
    return headers + '\n' + rows.join('\n');
  }

  return JSON.stringify({ patient: { id: patient.id, name: patient.name }, entries }, null, 2);
}
