import { prisma } from '../../config/prisma';
import { NotFoundError } from '../../utils/errors';
import { logAudit } from '../../utils/audit';

/**
 * Generate a full data export package for a patient.
 * Includes: messages, mood logs, rules (anonymized), crisis events, assignments, audit log.
 */
export async function exportPatientData(patientId: string, therapistId: string) {
  // Verify patient belongs to therapist
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, therapistId },
    select: {
      id: true,
      name: true,
      email: true,
      consentStatus: true,
      consentDate: true,
      crisisContact: true,
      active: true,
      createdAt: true,
    },
  });

  if (!patient) {
    throw new NotFoundError('Patient not found or not assigned to you');
  }

  // Gather all patient data in parallel
  const [messages, moodLogs, crisisEvents, assignments, rules, briefings, auditEntries] =
    await Promise.all([
      prisma.message.findMany({
        where: { patientId },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          direction: true,
          content: true,
          messageType: true,
          confidenceScore: true,
          createdAt: true,
        },
      }),

      prisma.moodLog.findMany({
        where: { patientId },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          score: true,
          note: true,
          createdAt: true,
        },
      }),

      prisma.crisisEvent.findMany({
        where: { patientId },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          detectionLayer: true,
          confidence: true,
          responseDelivered: true,
          therapistNotified: true,
          resolvedAt: true,
          createdAt: true,
        },
      }),

      prisma.assignment.findMany({
        where: { patientId },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          type: true,
          title: true,
          content: true,
          dueDate: true,
          completedAt: true,
          createdAt: true,
        },
      }),

      // Rules — anonymized (no trigger keywords, just name and category)
      prisma.rule.findMany({
        where: {
          OR: [{ patientId }, { patientId: null, therapistId }],
        },
        select: {
          id: true,
          name: true,
          escalationLevel: true,
          active: true,
          createdAt: true,
          // Omit triggerConfig (keywords) for patient privacy
        },
      }),

      prisma.briefing.findMany({
        where: { patientId },
        orderBy: { generatedAt: 'asc' },
        select: {
          id: true,
          sessionDate: true,
          content: true,
          generatedAt: true,
        },
      }),

      prisma.auditLog.findMany({
        where: {
          OR: [{ entityId: patientId }, { actorId: patientId }],
        },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          actorType: true,
          action: true,
          entityType: true,
          createdAt: true,
        },
      }),
    ]);

  // Log the export action
  await logAudit(therapistId, 'therapist', 'patient.data_export', 'patient', patientId);

  const exportData = {
    exportMetadata: {
      generatedAt: new Date().toISOString(),
      exportedBy: therapistId,
      format: 'json',
      version: '1.0',
    },
    patient,
    summary: {
      totalMessages: messages.length,
      totalMoodLogs: moodLogs.length,
      totalCrisisEvents: crisisEvents.length,
      totalAssignments: assignments.length,
      totalBriefings: briefings.length,
      totalAuditEntries: auditEntries.length,
    },
    messages,
    moodLogs,
    crisisEvents,
    assignments,
    activeRules: rules,
    briefings,
    auditTrail: auditEntries,
  };

  return exportData;
}

/**
 * Generate a human-readable text summary of patient data.
 */
export function generateReadableSummary(data: ReturnType<typeof exportPatientData> extends Promise<infer T> ? T : never): string {
  const lines: string[] = [];

  lines.push('═══════════════════════════════════════════');
  lines.push('UNLOCH PATIENT DATA EXPORT');
  lines.push('═══════════════════════════════════════════');
  lines.push('');
  lines.push(`Patient: ${data.patient.name}`);
  lines.push(`Email: ${data.patient.email}`);
  lines.push(`Consent Status: ${data.patient.consentStatus}`);
  lines.push(`Account Created: ${data.patient.createdAt}`);
  lines.push(`Exported: ${data.exportMetadata.generatedAt}`);
  lines.push('');

  lines.push('── Summary ──');
  lines.push(`Messages: ${data.summary.totalMessages}`);
  lines.push(`Mood Logs: ${data.summary.totalMoodLogs}`);
  lines.push(`Crisis Events: ${data.summary.totalCrisisEvents}`);
  lines.push(`Assignments: ${data.summary.totalAssignments}`);
  lines.push('');

  if (data.messages.length > 0) {
    lines.push('── Messages ──');
    for (const msg of data.messages) {
      lines.push(`[${msg.createdAt}] (${msg.messageType}) ${msg.content}`);
    }
    lines.push('');
  }

  if (data.moodLogs.length > 0) {
    lines.push('── Mood Logs ──');
    for (const log of data.moodLogs) {
      lines.push(`[${log.createdAt}] Score: ${log.score}/10${log.note ? ` — ${log.note}` : ''}`);
    }
    lines.push('');
  }

  if (data.crisisEvents.length > 0) {
    lines.push('── Crisis Events ──');
    for (const ev of data.crisisEvents) {
      lines.push(
        `[${ev.createdAt}] Layer: ${ev.detectionLayer}, Confidence: ${ev.confidence}, Resolved: ${ev.resolvedAt ?? 'No'}`
      );
    }
    lines.push('');
  }

  if (data.assignments.length > 0) {
    lines.push('── Assignments ──');
    for (const a of data.assignments) {
      lines.push(`[${a.type}] "${a.title}" — ${a.completedAt ? 'Completed' : 'Pending'}`);
    }
    lines.push('');
  }

  lines.push('── End of Export ──');

  return lines.join('\n');
}
