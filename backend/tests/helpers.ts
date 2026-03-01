import { prisma } from '../src/config/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../src/config/index';
import { v4 as uuid } from 'uuid';

export const TEST_PASSWORD = 'TestPass123';

/**
 * Create a test practice, therapist, and patient.
 * Returns auth tokens and entity IDs.
 */
export async function seedTestData() {
  const practiceId = uuid();
  const therapistId = uuid();
  const patientId = uuid();

  // Create practice
  await prisma.practice.create({
    data: {
      id: practiceId,
      name: 'Test Practice',
    },
  });

  // Create therapist
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 12);
  await prisma.therapist.create({
    data: {
      id: therapistId,
      practiceId,
      email: `therapist-${therapistId.slice(0, 8)}@test.com`,
      passwordHash,
      name: 'Dr. Test',
    },
  });

  // Create patient
  await prisma.patient.create({
    data: {
      id: patientId,
      therapistId,
      email: `patient-${patientId.slice(0, 8)}@test.com`,
      name: 'Test Patient',
      consentStatus: 'active',
    },
  });

  // Generate tokens
  const therapistToken = jwt.sign(
    { sub: therapistId, role: 'therapist', practiceId },
    config.JWT_SECRET,
    { expiresIn: '1h' } as jwt.SignOptions
  );

  const patientToken = jwt.sign(
    { sub: patientId, role: 'patient', therapistId },
    config.JWT_SECRET,
    { expiresIn: '1h' } as jwt.SignOptions
  );

  return {
    practiceId,
    therapistId,
    patientId,
    therapistEmail: `therapist-${therapistId.slice(0, 8)}@test.com`,
    patientEmail: `patient-${patientId.slice(0, 8)}@test.com`,
    therapistToken,
    patientToken,
  };
}

/**
 * Clean up test data. Deletes in correct order to respect FK constraints.
 * Temporarily disables immutable audit_log triggers for cleanup.
 */
export async function cleanupTestData() {
  // Disable immutable audit_log triggers so we can clean up test data
  await prisma.$executeRawUnsafe('ALTER TABLE audit_log DISABLE TRIGGER audit_log_no_update');
  await prisma.$executeRawUnsafe('ALTER TABLE audit_log DISABLE TRIGGER audit_log_no_delete');

  // Delete in reverse-dependency order
  await prisma.auditLog.deleteMany({});
  await prisma.alert.deleteMany({});
  await prisma.briefing.deleteMany({});
  await prisma.assignment.deleteMany({});
  await prisma.crisisEvent.deleteMany({});
  await prisma.moodLog.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.ruleVersion.deleteMany({});
  await prisma.rule.deleteMany({});
  await prisma.patient.deleteMany({});
  await prisma.therapist.deleteMany({});
  await prisma.practice.deleteMany({});

  // Re-enable immutable triggers
  await prisma.$executeRawUnsafe('ALTER TABLE audit_log ENABLE TRIGGER audit_log_no_update');
  await prisma.$executeRawUnsafe('ALTER TABLE audit_log ENABLE TRIGGER audit_log_no_delete');
}

/**
 * Create a rule for testing.
 */
export async function createTestRule(
  therapistId: string,
  patientId: string | null,
  overrides: Partial<{
    name: string;
    keywords: string[];
    response: string;
    escalationLevel: string;
    active: boolean;
    expiresAt: Date | null;
    priority: number;
  }> = {}
) {
  return prisma.rule.create({
    data: {
      therapistId,
      patientId,
      name: overrides.name ?? 'Test Rule',
      triggerConfig: {
        keywords: overrides.keywords ?? ['test-keyword'],
        priority: overrides.priority ?? 1,
      },
      responseContent: overrides.response ?? 'This is a test rule response.',
      escalationLevel: overrides.escalationLevel ?? 'informational',
      active: overrides.active ?? true,
      expiresAt: overrides.expiresAt ?? null,
    },
  });
}
