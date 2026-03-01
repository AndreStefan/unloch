import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { redis } from '../../config/redis';
import { logAudit } from '../../utils/audit';
import { BadRequestError, NotFoundError, ForbiddenError } from '../../utils/errors';

const RULE_RESPONSE_RATE_KEY = 'rule_resp:';
const RULE_RESPONSE_MAX = 3;
const RULE_RESPONSE_WINDOW = 10 * 60; // 10 minutes

// ─── CRUD ──────────────────────────────────────────────

export async function createRule(
  therapistId: string,
  data: {
    name: string;
    triggerConfig: { keywords: string[]; patterns?: string[] };
    responseContent: string;
    attribution?: string;
    escalationLevel?: string;
    patientId?: string;
    expiresAt?: string;
  },
) {
  // If patientId provided, verify therapist owns the patient
  if (data.patientId) {
    await verifyTherapistOwnsPatient(therapistId, data.patientId);
  }

  const result = await prisma.$transaction(async (tx) => {
    const rule = await tx.rule.create({
      data: {
        therapistId,
        patientId: data.patientId || null,
        name: data.name,
        triggerConfig: data.triggerConfig as unknown as Prisma.InputJsonValue,
        responseContent: data.responseContent,
        attribution: data.attribution || "Your therapist's guidance:",
        escalationLevel: data.escalationLevel || 'informational',
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      },
    });

    await tx.ruleVersion.create({
      data: {
        ruleId: rule.id,
        version: 1,
        triggerConfig: data.triggerConfig as unknown as Prisma.InputJsonValue,
        responseContent: data.responseContent,
        changedBy: therapistId,
      },
    });

    return rule;
  });

  await logAudit(therapistId, 'therapist', 'rule.create', 'rule', result.id, {
    name: data.name,
    patientId: data.patientId,
    escalationLevel: data.escalationLevel || 'informational',
  });

  return sanitizeRule(result);
}

export async function updateRule(
  ruleId: string,
  therapistId: string,
  data: {
    name?: string;
    triggerConfig?: { keywords: string[]; patterns?: string[] };
    responseContent?: string;
    attribution?: string;
    escalationLevel?: string;
    patientId?: string;
    expiresAt?: string | null;
  },
) {
  const existing = await prisma.rule.findUnique({ where: { id: ruleId } });
  if (!existing) throw new NotFoundError('Rule not found');
  if (existing.therapistId !== therapistId) throw new ForbiddenError('Not your rule');

  if (data.patientId) {
    await verifyTherapistOwnsPatient(therapistId, data.patientId);
  }

  const newVersion = existing.version + 1;

  const result = await prisma.$transaction(async (tx) => {
    const rule = await tx.rule.update({
      where: { id: ruleId },
      data: {
        name: data.name ?? existing.name,
        triggerConfig: data.triggerConfig
          ? (data.triggerConfig as unknown as Prisma.InputJsonValue)
          : undefined,
        responseContent: data.responseContent ?? existing.responseContent,
        attribution: data.attribution ?? existing.attribution,
        escalationLevel: data.escalationLevel ?? existing.escalationLevel,
        patientId: data.patientId !== undefined ? (data.patientId || null) : existing.patientId,
        expiresAt: data.expiresAt !== undefined
          ? (data.expiresAt ? new Date(data.expiresAt) : null)
          : existing.expiresAt,
        version: newVersion,
      },
    });

    await tx.ruleVersion.create({
      data: {
        ruleId: rule.id,
        version: newVersion,
        triggerConfig: (data.triggerConfig ?? existing.triggerConfig) as Prisma.InputJsonValue,
        responseContent: data.responseContent ?? existing.responseContent,
        changedBy: therapistId,
      },
    });

    return rule;
  });

  await logAudit(therapistId, 'therapist', 'rule.update', 'rule', ruleId, {
    previousVersion: existing.version,
    newVersion,
    changedFields: Object.keys(data).filter((k) => data[k as keyof typeof data] !== undefined),
  });

  return sanitizeRule(result);
}

export async function deactivateRule(ruleId: string, therapistId: string) {
  const existing = await prisma.rule.findUnique({ where: { id: ruleId } });
  if (!existing) throw new NotFoundError('Rule not found');
  if (existing.therapistId !== therapistId) throw new ForbiddenError('Not your rule');

  const rule = await prisma.rule.update({
    where: { id: ruleId },
    data: { active: false },
  });

  await logAudit(therapistId, 'therapist', 'rule.deactivate', 'rule', ruleId, {
    name: existing.name,
    patientId: existing.patientId,
  });

  return sanitizeRule(rule);
}

export async function getRulesForTherapist(therapistId: string) {
  const rules = await prisma.rule.findMany({
    where: { therapistId },
    orderBy: { updatedAt: 'desc' },
  });
  return rules.map(sanitizeRule);
}

export async function getRulesForPatient(patientId: string, therapistId: string) {
  await verifyTherapistOwnsPatient(therapistId, patientId);

  const rules = await prisma.rule.findMany({
    where: {
      therapistId,
      active: true,
      OR: [{ patientId }, { patientId: null }],
      AND: [
        { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      ],
    },
    orderBy: { updatedAt: 'desc' },
  });
  return rules.map(sanitizeRule);
}

export async function getRuleDetail(ruleId: string, therapistId: string) {
  const rule = await prisma.rule.findUnique({
    where: { id: ruleId },
    include: {
      versions: { orderBy: { version: 'desc' } },
    },
  });

  if (!rule) throw new NotFoundError('Rule not found');
  if (rule.therapistId !== therapistId) throw new ForbiddenError('Not your rule');

  return {
    ...sanitizeRule(rule),
    versions: rule.versions.map((v) => ({
      id: v.id,
      version: v.version,
      triggerConfig: v.triggerConfig,
      responseContent: v.responseContent,
      changedBy: v.changedBy,
      changedAt: v.changedAt,
    })),
  };
}

// ─── Rule Matching (MVP — keyword only) ────────────────

const ESCALATION_PRIORITY: Record<string, number> = {
  urgent: 3,
  alert: 2,
  informational: 1,
};

export async function matchRules(patientId: string, messageContent: string) {
  // Rate limit: max 3 rule responses per 10min per patient
  const rateLimitKey = `${RULE_RESPONSE_RATE_KEY}${patientId}`;
  const currentCount = await redis.get(rateLimitKey);
  if (currentCount && parseInt(currentCount, 10) >= RULE_RESPONSE_MAX) {
    return []; // Rate limited — no rule responses
  }

  // Get patient's therapist to fetch relevant rules
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { therapistId: true },
  });
  if (!patient) return [];

  const rules = await prisma.rule.findMany({
    where: {
      therapistId: patient.therapistId,
      active: true,
      OR: [{ patientId }, { patientId: null }],
      AND: [
        { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      ],
    },
  });

  const messageLower = messageContent.toLowerCase();

  const matched = rules.filter((rule) => {
    const config = rule.triggerConfig as { keywords?: string[]; patterns?: string[] };
    if (!config.keywords || config.keywords.length === 0) return false;
    return config.keywords.some((kw) => messageLower.includes(kw.toLowerCase()));
  });

  // Sort by escalation priority (desc), then by most recently updated
  matched.sort((a, b) => {
    const prioDiff = (ESCALATION_PRIORITY[b.escalationLevel] || 0) -
                     (ESCALATION_PRIORITY[a.escalationLevel] || 0);
    if (prioDiff !== 0) return prioDiff;
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  });

  // Increment rate limiter for each response that will be sent
  if (matched.length > 0) {
    const pipeline = redis.pipeline();
    pipeline.incr(rateLimitKey);
    pipeline.expire(rateLimitKey, RULE_RESPONSE_WINDOW);
    await pipeline.exec();
  }

  return matched.map((rule) => ({
    ruleId: rule.id,
    name: rule.name,
    responseContent: rule.responseContent,
    attribution: rule.attribution,
    escalationLevel: rule.escalationLevel,
    confidence: 1.0, // Keyword match = 100% confidence
  }));
}

// ─── Test Simulation ───────────────────────────────────

export async function testRuleMatch(ruleId: string, therapistId: string, testMessage: string) {
  const rule = await prisma.rule.findUnique({ where: { id: ruleId } });
  if (!rule) throw new NotFoundError('Rule not found');
  if (rule.therapistId !== therapistId) throw new ForbiddenError('Not your rule');

  const config = rule.triggerConfig as { keywords?: string[]; patterns?: string[] };
  const messageLower = testMessage.toLowerCase();

  const matchedKeywords = (config.keywords || []).filter((kw) =>
    messageLower.includes(kw.toLowerCase()),
  );

  return {
    wouldMatch: matchedKeywords.length > 0,
    matchedKeywords,
    responseContent: matchedKeywords.length > 0 ? rule.responseContent : null,
    attribution: matchedKeywords.length > 0 ? rule.attribution : null,
  };
}

// ─── Helpers ───────────────────────────────────────────

async function verifyTherapistOwnsPatient(therapistId: string, patientId: string) {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { therapistId: true },
  });
  if (!patient) throw new NotFoundError('Patient not found');
  if (patient.therapistId !== therapistId) {
    throw new BadRequestError('Patient is not assigned to you', 'NOT_ASSIGNED');
  }
}

function sanitizeRule(rule: {
  id: string;
  name: string;
  triggerConfig: unknown;
  responseContent: string;
  attribution: string;
  escalationLevel: string;
  active: boolean;
  patientId: string | null;
  version: number;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: rule.id,
    name: rule.name,
    triggerConfig: rule.triggerConfig,
    responseContent: rule.responseContent,
    attribution: rule.attribution,
    escalationLevel: rule.escalationLevel,
    active: rule.active,
    patientId: rule.patientId,
    version: rule.version,
    expiresAt: rule.expiresAt,
    createdAt: rule.createdAt,
    updatedAt: rule.updatedAt,
  };
}
