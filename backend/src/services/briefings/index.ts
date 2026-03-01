import axios from 'axios';
import { prisma } from '../../config/prisma';
import { config } from '../../config/index';
import { NotFoundError } from '../../utils/errors';
import { logAudit } from '../../utils/audit';

/**
 * Generate a pre-session briefing for a patient.
 * Gathers all between-session data and sends to AI service.
 */
export async function generateBriefing(
  patientId: string,
  therapistId: string,
  sessionDate?: Date
) {
  // Verify patient belongs to therapist
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, therapistId },
  });

  if (!patient) {
    throw new NotFoundError('Patient not found or not assigned to you');
  }

  // Find the last briefing to determine the "since" date
  const lastBriefing = await prisma.briefing.findFirst({
    where: { patientId, therapistId },
    orderBy: { generatedAt: 'desc' },
  });

  const sinceDate = lastBriefing?.generatedAt ?? patient.createdAt;
  const now = new Date();

  // Gather all between-session data
  const [messages, moodLogs, crisisEvents, assignments, triggeredRules] = await Promise.all([
    // Messages
    prisma.message.findMany({
      where: {
        patientId,
        createdAt: { gte: sinceDate },
      },
      orderBy: { createdAt: 'asc' },
      select: { content: true, messageType: true, createdAt: true },
    }),

    // Mood logs
    prisma.moodLog.findMany({
      where: {
        patientId,
        createdAt: { gte: sinceDate },
      },
      orderBy: { createdAt: 'asc' },
      select: { score: true, note: true, createdAt: true },
    }),

    // Crisis events
    prisma.crisisEvent.findMany({
      where: {
        patientId,
        createdAt: { gte: sinceDate },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        detectionLayer: true,
        confidence: true,
        createdAt: true,
        resolvedAt: true,
        resolvedBy: true,
      },
    }),

    // Assignments
    prisma.assignment.findMany({
      where: {
        patientId,
        therapistId,
        createdAt: { gte: sinceDate },
      },
      select: {
        title: true,
        type: true,
        completedAt: true,
      },
    }),

    // Triggered rules — group by rule with count
    prisma.message.groupBy({
      by: ['matchedRuleId'],
      where: {
        patientId,
        matchedRuleId: { not: null },
        createdAt: { gte: sinceDate },
      },
      _count: { matchedRuleId: true },
      _max: { createdAt: true },
    }),
  ]);

  // Resolve rule names for triggered rules
  const ruleIds = triggeredRules
    .map((r) => r.matchedRuleId)
    .filter((id): id is string => id !== null);

  const ruleNames = ruleIds.length > 0
    ? await prisma.rule.findMany({
        where: { id: { in: ruleIds } },
        select: { id: true, name: true },
      })
    : [];

  const ruleNameMap = new Map(ruleNames.map((r) => [r.id, r.name]));

  // Build AI request payload
  const aiPayload = {
    patientId,
    therapistId,
    patientName: patient.name,
    periodStart: sinceDate.toISOString(),
    periodEnd: now.toISOString(),
    messages: messages.map((m) => ({
      content: m.content,
      type: m.messageType,
      createdAt: m.createdAt.toISOString(),
    })),
    moodLogs: moodLogs.map((ml) => ({
      score: ml.score,
      note: ml.note ?? undefined,
      createdAt: ml.createdAt.toISOString(),
    })),
    triggeredRules: triggeredRules.map((tr) => ({
      ruleName: ruleNameMap.get(tr.matchedRuleId!) ?? 'Unknown Rule',
      count: tr._count.matchedRuleId,
      lastTriggered: tr._max.createdAt?.toISOString() ?? '',
    })),
    crisisEvents: crisisEvents.map((ce) => ({
      detectionLayer: ce.detectionLayer,
      confidence: ce.confidence,
      createdAt: ce.createdAt.toISOString(),
      status: ce.resolvedAt ? 'resolved' : 'active',
    })),
    assignments: assignments.map((a) => ({
      title: a.title,
      type: a.type,
      status: a.completedAt ? 'completed' : 'pending',
      completedAt: a.completedAt?.toISOString() ?? undefined,
    })),
  };

  // Call AI service
  let briefingContent: string;
  try {
    const aiResponse = await axios.post(
      `${config.AI_SERVICE_URL}/api/v1/briefings/generate`,
      aiPayload,
      { timeout: 30000 }
    );
    briefingContent = aiResponse.data.content;
  } catch (err) {
    // If AI service is down, generate a basic data-only summary
    briefingContent = generateFallbackBriefing(aiPayload);
  }

  // Save to database
  const briefing = await prisma.briefing.create({
    data: {
      patientId,
      therapistId,
      sessionDate: sessionDate ?? now,
      content: briefingContent,
    },
  });

  // Audit log
  await logAudit(
    therapistId,
    'therapist',
    'briefing.generated',
    'briefing',
    briefing.id,
    { patientId, periodStart: sinceDate.toISOString(), periodEnd: now.toISOString() }
  );

  return briefing;
}

/**
 * Get a single briefing by ID (only if therapist owns it).
 */
export async function getBriefing(briefingId: string, therapistId: string) {
  const briefing = await prisma.briefing.findFirst({
    where: { id: briefingId, therapistId },
    include: {
      patient: { select: { id: true, name: true, email: true } },
    },
  });

  if (!briefing) {
    throw new NotFoundError('Briefing not found');
  }

  return briefing;
}

/**
 * Get all briefings for a patient (paginated), most recent first.
 */
export async function getBriefingsForPatient(
  patientId: string,
  therapistId: string,
  limit = 10,
  offset = 0
) {
  // Verify patient belongs to therapist
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, therapistId },
  });

  if (!patient) {
    throw new NotFoundError('Patient not found or not assigned to you');
  }

  const [briefings, total] = await Promise.all([
    prisma.briefing.findMany({
      where: { patientId, therapistId },
      orderBy: { generatedAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        sessionDate: true,
        generatedAt: true,
        content: true,
      },
    }),
    prisma.briefing.count({
      where: { patientId, therapistId },
    }),
  ]);

  return { briefings, total, limit, offset };
}

/**
 * Fallback briefing when AI service is unavailable.
 * Returns a structured data summary without AI interpretation.
 */
function generateFallbackBriefing(data: Record<string, unknown>): string {
  const messages = (data.messages as Array<Record<string, unknown>>) ?? [];
  const moodLogs = (data.moodLogs as Array<Record<string, unknown>>) ?? [];
  const triggeredRules = (data.triggeredRules as Array<Record<string, unknown>>) ?? [];
  const crisisEvents = (data.crisisEvents as Array<Record<string, unknown>>) ?? [];
  const assignments = (data.assignments as Array<Record<string, unknown>>) ?? [];

  const sections = [
    '**AI-generated summary — review against raw interaction data before clinical use**',
    '',
    '*Note: AI service was unavailable. This is a raw data summary.*',
    '',
    `## Between-Session Summary`,
    `**Period:** ${data.periodStart} to ${data.periodEnd}`,
    `**Total Interactions:** ${messages.length} messages`,
    '',
    `### Mood Trend`,
    moodLogs.length > 0
      ? moodLogs.map((ml) => `- Score: ${ml.score}/10 on ${ml.createdAt}${ml.note ? ` (${ml.note})` : ''}`).join('\n')
      : 'No mood logs recorded.',
    '',
    `### Rules Triggered`,
    triggeredRules.length > 0
      ? triggeredRules.map((r) => `- "${r.ruleName}" fired ${r.count} time(s)`).join('\n')
      : 'No rules triggered.',
    '',
    `### Flagged Moments`,
    crisisEvents.length > 0
      ? crisisEvents.map((ce) => `- Crisis event (${ce.detectionLayer}): confidence ${ce.confidence}, status ${ce.status}`).join('\n')
      : 'No flagged moments.',
    '',
    `### Homework & Medication`,
    assignments.length > 0
      ? assignments.map((a) => `- [${a.type}] "${a.title}" — ${a.status}`).join('\n')
      : 'No assignments during this period.',
  ];

  return sections.join('\n');
}
