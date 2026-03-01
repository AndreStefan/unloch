import { prisma } from '../../config/prisma';
import { config } from '../../config/index';
import { logAudit } from '../../utils/audit';
import { NotFoundError, BadRequestError } from '../../utils/errors';

// ─── AI Service Client ─────────────────────────────────

interface AiCrisisResult {
  is_crisis: boolean;
  confidence: number;
  reasoning: string;
  detected_signals: string[];
}

export async function callAiCrisisDetection(
  message: string,
  context: string[],
): Promise<AiCrisisResult> {
  const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
  const response = await fetch(`${aiServiceUrl}/api/v1/crisis/detect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, context: context.slice(-5) }),
  });

  if (!response.ok) {
    throw new Error(`AI service returned ${response.status}: ${await response.text()}`);
  }

  return response.json() as Promise<AiCrisisResult>;
}

// ─── Crisis Event Handling ─────────────────────────────

export async function handleCrisisEvent(
  patientId: string,
  messageId: string | null,
  detectionLayer: string,
  confidence: number,
  metadata?: Record<string, unknown>,
) {
  // If we don't have a messageId yet (middleware runs before message is saved),
  // create a system crisis message first
  let resolvedMessageId = messageId;

  if (!resolvedMessageId) {
    const crisisMessage = await prisma.message.create({
      data: {
        patientId,
        direction: 'inbound',
        content: (metadata?.messageContent as string) || '[crisis detected]',
        messageType: 'crisis',
      },
    });
    resolvedMessageId = crisisMessage.id;
  }

  const crisisEvent = await prisma.crisisEvent.create({
    data: {
      patientId,
      triggerMessageId: resolvedMessageId,
      detectionLayer,
      confidence,
      responseDelivered: 'Crisis resources presented to patient. Therapist notified.',
      therapistNotified: new Date(),
    },
  });

  // Mock push notification for MVP — log + alert creation
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { name: true, therapistId: true },
  });

  if (patient) {
    console.log(
      `[CRISIS ALERT] Patient "${patient.name}" (${patientId}) — ` +
      `Layer: ${detectionLayer}, Confidence: ${confidence}. ` +
      `Therapist ${patient.therapistId} notified.`,
    );
  }

  await logAudit(
    'system',
    'system',
    'crisis.event_created',
    'crisis_event',
    crisisEvent.id,
    {
      patientId,
      detectionLayer,
      confidence,
      triggerMessageId: resolvedMessageId,
      ...metadata,
    },
  );

  return crisisEvent;
}

// ─── Clear Crisis (therapist action) ───────────────────

export async function clearCrisis(crisisEventId: string, therapistId: string) {
  const crisisEvent = await prisma.crisisEvent.findUnique({
    where: { id: crisisEventId },
    include: { patient: { select: { therapistId: true } } },
  });

  if (!crisisEvent) {
    throw new NotFoundError('Crisis event not found');
  }

  if (crisisEvent.patient.therapistId !== therapistId) {
    throw new BadRequestError('You are not the assigned therapist for this patient', 'NOT_ASSIGNED');
  }

  if (crisisEvent.resolvedAt) {
    throw new BadRequestError('Crisis event already resolved', 'ALREADY_RESOLVED');
  }

  const updated = await prisma.crisisEvent.update({
    where: { id: crisisEventId },
    data: {
      resolvedAt: new Date(),
      resolvedBy: therapistId,
    },
  });

  await logAudit(
    therapistId,
    'therapist',
    'crisis.cleared',
    'crisis_event',
    crisisEventId,
    { patientId: crisisEvent.patientId },
  );

  return updated;
}

// ─── Get Crisis History ────────────────────────────────

export async function getCrisisEvents(patientId: string, therapistId: string) {
  // Verify therapist owns this patient
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { therapistId: true },
  });

  if (!patient) {
    throw new NotFoundError('Patient not found');
  }

  if (patient.therapistId !== therapistId) {
    throw new BadRequestError('You are not the assigned therapist for this patient', 'NOT_ASSIGNED');
  }

  return prisma.crisisEvent.findMany({
    where: { patientId },
    orderBy: { createdAt: 'desc' },
    include: {
      triggerMessage: {
        select: { content: true, createdAt: true },
      },
    },
  });
}
