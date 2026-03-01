import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/index';
import { prisma } from '../../src/config/prisma';
import { redis } from '../../src/config/redis';
import { config } from '../../src/config/index';
import { seedTestData, cleanupTestData, createTestRule } from '../helpers';
import { v4 as uuid } from 'uuid';

describe('Message Pipeline Integration Tests', () => {
  let testData: Awaited<ReturnType<typeof seedTestData>>;

  beforeAll(async () => {
    await cleanupTestData();
    await redis.flushdb();
    testData = await seedTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await redis.flushdb();
  });

  // ── Full Flow ───────────────────────────────────────────

  describe('Full pipeline: send → crisis check → rule match → response', () => {
    it('should save inbound and outbound messages with correct types', async () => {
      // Clear rate limiter
      const keys = await redis.keys('rule_resp:*');
      if (keys.length > 0) await redis.del(...keys);

      await createTestRule(testData.therapistId, null, {
        name: 'Pipeline Test Rule',
        keywords: ['pipeline-test'],
        response: 'Pipeline rule fired correctly.',
      });

      const res = await request(app)
        .post('/api/v1/messages')
        .set('Authorization', `Bearer ${testData.patientToken}`)
        .send({ content: 'I want to discuss pipeline-test topic' })
        .expect(201);

      // Check inbound message
      expect(res.body.message.direction).toBe('inbound');
      expect(res.body.message.messageType).toBe('patient');
      expect(res.body.message.content).toBe('I want to discuss pipeline-test topic');

      // Check outbound response
      expect(res.body.response.direction).toBe('outbound');
      expect(res.body.response.messageType).toBe('rule_response');
      expect(res.body.response.content).toContain('Pipeline rule fired correctly');
      expect(res.body.response.matchedRuleId).toBeTruthy();

      // Verify both messages persisted in database
      const inbound = await prisma.message.findUnique({
        where: { id: res.body.message.id },
      });
      expect(inbound).not.toBeNull();
      expect(inbound!.direction).toBe('inbound');

      const outbound = await prisma.message.findUnique({
        where: { id: res.body.response.id },
      });
      expect(outbound).not.toBeNull();
      expect(outbound!.direction).toBe('outbound');
    });

    it('should include default response with therapist name when no rule matches', async () => {
      const res = await request(app)
        .post('/api/v1/messages')
        .set('Authorization', `Bearer ${testData.patientToken}`)
        .send({ content: 'Just wanted to share that flowers are blooming' })
        .expect(201);

      expect(res.body.response.messageType).toBe('system');
      expect(res.body.response.content).toContain('Dr. Test');
    });
  });

  // ── Audit Log Verification ──────────────────────────────

  describe('Audit log entries for message processing', () => {
    it('should create audit log entries for processed messages', async () => {
      // Send a message
      const res = await request(app)
        .post('/api/v1/messages')
        .set('Authorization', `Bearer ${testData.patientToken}`)
        .send({ content: 'Audit trail test message' })
        .expect(201);

      // Check audit logs
      const auditEntries = await prisma.auditLog.findMany({
        where: {
          entityId: res.body.message.id,
          action: 'message.processed',
        },
      });

      expect(auditEntries.length).toBeGreaterThanOrEqual(1);
      const entry = auditEntries[0];
      expect(entry.actorId).toBe(testData.patientId);
      expect(entry.actorType).toBe('patient');
      expect(entry.entityType).toBe('message');
    });

    it('should create audit log for message.sent action', async () => {
      const res = await request(app)
        .post('/api/v1/messages')
        .set('Authorization', `Bearer ${testData.patientToken}`)
        .send({ content: 'Sent audit test message' })
        .expect(201);

      const sentAudits = await prisma.auditLog.findMany({
        where: {
          entityId: res.body.message.id,
          action: 'message.sent',
        },
      });

      expect(sentAudits.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── Message Attribution ─────────────────────────────────

  describe('Rule response attribution', () => {
    it('should include therapist attribution in rule response', async () => {
      const keys = await redis.keys('rule_resp:*');
      if (keys.length > 0) await redis.del(...keys);

      await createTestRule(testData.therapistId, null, {
        name: 'Attribution Test Rule',
        keywords: ['attribution-test'],
        response: 'Do the grounding exercise.',
      });

      const res = await request(app)
        .post('/api/v1/messages')
        .set('Authorization', `Bearer ${testData.patientToken}`)
        .send({ content: 'Need help with attribution-test' })
        .expect(201);

      // Default attribution prefix
      expect(res.body.response.content).toContain("Your therapist's guidance:");
      expect(res.body.response.content).toContain('grounding exercise');
    });

    it('should use custom attribution when set', async () => {
      const keys = await redis.keys('rule_resp:*');
      if (keys.length > 0) await redis.del(...keys);

      // Create rule with custom attribution via API
      const ruleRes = await request(app)
        .post('/api/v1/rules')
        .set('Authorization', `Bearer ${testData.therapistToken}`)
        .send({
          name: 'Custom Attribution Rule',
          triggerConfig: { keywords: ['custom-attr-kw'] },
          responseContent: 'Try the new technique.',
          attribution: 'A note from Dr. Test:',
        })
        .expect(201);

      const res = await request(app)
        .post('/api/v1/messages')
        .set('Authorization', `Bearer ${testData.patientToken}`)
        .send({ content: 'I need custom-attr-kw help' })
        .expect(201);

      expect(res.body.response.content).toContain('A note from Dr. Test:');
      expect(res.body.response.content).toContain('Try the new technique');
    });
  });

  // ── Access Control: Patient sees own messages only ──────

  describe('Access control - message visibility', () => {
    it('should allow patient to view their own messages', async () => {
      // First send a message to have data
      await request(app)
        .post('/api/v1/messages')
        .set('Authorization', `Bearer ${testData.patientToken}`)
        .send({ content: 'My private message for visibility test' });

      const res = await request(app)
        .get(`/api/v1/messages/${testData.patientId}`)
        .set('Authorization', `Bearer ${testData.patientToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('messages');
      expect(Array.isArray(res.body.messages)).toBe(true);
      expect(res.body.messages.length).toBeGreaterThan(0);
      expect(res.body).toHaveProperty('hasMore');
    });

    it('should NOT allow patient to view other patients messages', async () => {
      // Create another patient
      const otherPatientId = uuid();
      await prisma.patient.create({
        data: {
          id: otherPatientId,
          therapistId: testData.therapistId,
          email: `other-${otherPatientId.slice(0, 8)}@test.com`,
          name: 'Other Patient',
          consentStatus: 'active',
        },
      });

      // Try to view other patient's messages
      await request(app)
        .get(`/api/v1/messages/${otherPatientId}`)
        .set('Authorization', `Bearer ${testData.patientToken}`)
        .expect(403);
    });

    it('should allow therapist to view their patients messages', async () => {
      const res = await request(app)
        .get(`/api/v1/messages/${testData.patientId}`)
        .set('Authorization', `Bearer ${testData.therapistToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('messages');
      expect(Array.isArray(res.body.messages)).toBe(true);
    });

    it('should NOT allow therapist to view unassigned patients messages', async () => {
      // Create a patient for a different therapist
      const otherPracticeId = uuid();
      const otherTherapistId = uuid();
      const unassignedPatientId = uuid();

      await prisma.practice.create({
        data: { id: otherPracticeId, name: 'Other Practice' },
      });

      await prisma.therapist.create({
        data: {
          id: otherTherapistId,
          practiceId: otherPracticeId,
          email: `other-therapist-${otherTherapistId.slice(0, 8)}@test.com`,
          passwordHash: 'unused',
          name: 'Dr. Other',
        },
      });

      await prisma.patient.create({
        data: {
          id: unassignedPatientId,
          therapistId: otherTherapistId,
          email: `unassigned-${unassignedPatientId.slice(0, 8)}@test.com`,
          name: 'Unassigned Patient',
          consentStatus: 'active',
        },
      });

      // Try to view unassigned patient's messages
      await request(app)
        .get(`/api/v1/messages/${unassignedPatientId}`)
        .set('Authorization', `Bearer ${testData.therapistToken}`)
        .expect(403);
    });
  });

  // ── Message History Pagination ──────────────────────────

  describe('Message history pagination', () => {
    it('should respect limit parameter', async () => {
      const res = await request(app)
        .get(`/api/v1/messages/${testData.patientId}?limit=2`)
        .set('Authorization', `Bearer ${testData.therapistToken}`)
        .expect(200);

      expect(res.body.messages.length).toBeLessThanOrEqual(2);
    });

    it('should return messages in reverse chronological order', async () => {
      const res = await request(app)
        .get(`/api/v1/messages/${testData.patientId}`)
        .set('Authorization', `Bearer ${testData.therapistToken}`)
        .expect(200);

      if (res.body.messages.length >= 2) {
        const dates = res.body.messages.map((m: { createdAt: string }) =>
          new Date(m.createdAt).getTime()
        );
        for (let i = 0; i < dates.length - 1; i++) {
          expect(dates[i]).toBeGreaterThanOrEqual(dates[i + 1]);
        }
      }
    });
  });

  // ── Therapist Cannot Send Messages ──────────────────────

  describe('Only patients can send messages', () => {
    it('should reject message from therapist', async () => {
      await request(app)
        .post('/api/v1/messages')
        .set('Authorization', `Bearer ${testData.therapistToken}`)
        .send({ content: 'Therapist trying to send' })
        .expect(403);
    });

    it('should reject message without auth', async () => {
      await request(app)
        .post('/api/v1/messages')
        .send({ content: 'No auth message' })
        .expect(401);
    });
  });
});
