import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/index';
import { prisma } from '../../src/config/prisma';
import { redis } from '../../src/config/redis';
import { seedTestData, cleanupTestData, TEST_PASSWORD } from '../helpers';

describe('Crisis Detection Integration Tests', () => {
  let testData: Awaited<ReturnType<typeof seedTestData>>;
  const originalFetch = global.fetch;

  beforeAll(async () => {
    await cleanupTestData();
    await redis.flushdb();
    testData = await seedTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await redis.flushdb();
    // Restore original fetch
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    // Reset fetch mock before each test
    global.fetch = originalFetch;
  });

  // ── HIGH Keyword → Immediate Crisis ─────────────────────

  describe('HIGH crisis keyword detection', () => {
    it('should create crisis event for HIGH keyword "kill myself"', async () => {
      const res = await request(app)
        .post('/api/v1/messages')
        .set('Authorization', `Bearer ${testData.patientToken}`)
        .send({
          content: 'I want to kill myself',
          patientId: testData.patientId,
        })
        .expect(200);

      expect(res.body.crisis).toBe(true);
      expect(res.body).toHaveProperty('crisisEventId');
      expect(res.body).toHaveProperty('response');
      expect(res.body.response).toHaveProperty('message');
      expect(res.body.response).toHaveProperty('resources');

      // Verify crisis event exists in database
      const crisisEvent = await prisma.crisisEvent.findUnique({
        where: { id: res.body.crisisEventId },
      });
      expect(crisisEvent).not.toBeNull();
      expect(crisisEvent!.patientId).toBe(testData.patientId);
      expect(crisisEvent!.detectionLayer).toBe('keyword');
      expect(crisisEvent!.confidence).toBe(1.0);
      expect(crisisEvent!.therapistNotified).not.toBeNull();
    });

    it('should create crisis event for HIGH keyword "suicide"', async () => {
      const res = await request(app)
        .post('/api/v1/messages')
        .set('Authorization', `Bearer ${testData.patientToken}`)
        .send({
          content: 'I have been thinking about suicide',
          patientId: testData.patientId,
        })
        .expect(200);

      expect(res.body.crisis).toBe(true);
      expect(res.body).toHaveProperty('crisisEventId');
    });

    it('should create crisis event for HIGH keyword "self-harm"', async () => {
      const res = await request(app)
        .post('/api/v1/messages')
        .set('Authorization', `Bearer ${testData.patientToken}`)
        .send({
          content: 'I have been engaging in self-harm',
          patientId: testData.patientId,
        })
        .expect(200);

      expect(res.body.crisis).toBe(true);
    });

    it('should create crisis message in the database', async () => {
      const res = await request(app)
        .post('/api/v1/messages')
        .set('Authorization', `Bearer ${testData.patientToken}`)
        .send({
          content: 'I want to end my life tonight',
          patientId: testData.patientId,
        });

      // Verify the crisis message was saved
      const crisisEvent = await prisma.crisisEvent.findUnique({
        where: { id: res.body.crisisEventId },
        include: { triggerMessage: true },
      });

      expect(crisisEvent!.triggerMessage).not.toBeNull();
      expect(crisisEvent!.triggerMessage.content).toContain('end my life');
      expect(crisisEvent!.triggerMessage.messageType).toBe('crisis');
    });
  });

  // ── MODERATE Keyword → AI Classification ────────────────

  describe('MODERATE keyword with AI classification', () => {
    it('should create crisis when AI confirms moderate keyword', async () => {
      // Mock AI service to confirm crisis
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          is_crisis: true,
          confidence: 0.92,
          reasoning: 'Patient expressing passive suicidal ideation',
          detected_signals: ['passive_ideation', 'hopelessness'],
        }),
      }) as unknown as typeof fetch;

      const res = await request(app)
        .post('/api/v1/messages')
        .set('Authorization', `Bearer ${testData.patientToken}`)
        .send({
          content: 'I feel completely hopeless about everything',
          patientId: testData.patientId,
        })
        .expect(200);

      expect(res.body.crisis).toBe(true);
      expect(res.body).toHaveProperty('crisisEventId');

      // Verify crisis event with LLM detection layer
      const crisisEvent = await prisma.crisisEvent.findUnique({
        where: { id: res.body.crisisEventId },
      });
      expect(crisisEvent!.detectionLayer).toBe('llm');
      expect(crisisEvent!.confidence).toBe(0.92);
    });

    it('should NOT create crisis when AI denies moderate keyword', async () => {
      // Mock AI service to deny crisis
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          is_crisis: false,
          confidence: 0.2,
          reasoning: 'Patient expressing general frustration, not crisis',
          detected_signals: [],
        }),
      }) as unknown as typeof fetch;

      const res = await request(app)
        .post('/api/v1/messages')
        .set('Authorization', `Bearer ${testData.patientToken}`)
        .send({
          content: 'I feel trapped in this situation at work',
          patientId: testData.patientId,
        })
        .expect(201); // 201 = normal message processed (not crisis short-circuit)

      expect(res.body.crisis).toBeUndefined();
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('response');
    });

    it('should escalate when AI service is unavailable (safety bias)', async () => {
      // Mock AI service to fail
      global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

      const res = await request(app)
        .post('/api/v1/messages')
        .set('Authorization', `Bearer ${testData.patientToken}`)
        .send({
          content: 'I feel like there is no way out of this',
          patientId: testData.patientId,
        })
        .expect(200);

      // Should escalate due to safety bias when AI is down
      expect(res.body.crisis).toBe(true);
      expect(res.body).toHaveProperty('response');
    });
  });

  // ── Safe Message → No Crisis ────────────────────────────

  describe('Safe messages - no crisis', () => {
    it('should process safe message normally (no crisis)', async () => {
      const res = await request(app)
        .post('/api/v1/messages')
        .set('Authorization', `Bearer ${testData.patientToken}`)
        .send({
          content: 'I had a good day today and felt productive',
          patientId: testData.patientId,
        })
        .expect(201);

      expect(res.body.crisis).toBeUndefined();
      expect(res.body).toHaveProperty('message');
      expect(res.body.message.content).toBe('I had a good day today and felt productive');
      expect(res.body.message.messageType).toBe('patient');
      expect(res.body).toHaveProperty('response');
    });

    it('should not trigger crisis on unrelated words', async () => {
      const res = await request(app)
        .post('/api/v1/messages')
        .set('Authorization', `Bearer ${testData.patientToken}`)
        .send({
          content: 'My assignment is due tomorrow',
          patientId: testData.patientId,
        })
        .expect(201);

      expect(res.body.crisis).toBeUndefined();
      expect(res.body.message.messageType).toBe('patient');
    });
  });

  // ── Patient Cannot Clear Crisis ─────────────────────────

  describe('Crisis clearing - access control', () => {
    let crisisEventId: string;

    beforeAll(async () => {
      // Create a crisis event to clear
      const res = await request(app)
        .post('/api/v1/messages')
        .set('Authorization', `Bearer ${testData.patientToken}`)
        .send({
          content: 'I want to hurt myself badly',
          patientId: testData.patientId,
        });

      crisisEventId = res.body.crisisEventId;
    });

    it('should reject patient attempting to clear crisis', async () => {
      await request(app)
        .put(`/api/v1/crisis/${crisisEventId}/clear`)
        .set('Authorization', `Bearer ${testData.patientToken}`)
        .expect(403);
    });

    it('should reject therapist without MFA clearing crisis', async () => {
      // Disable MFA for the therapist to test the guard
      await prisma.therapist.update({
        where: { id: testData.therapistId },
        data: { mfaEnabled: false, mfaSecret: null },
      });

      // Get a fresh token without mfaVerified
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testData.therapistEmail, password: TEST_PASSWORD });

      await request(app)
        .put(`/api/v1/crisis/${crisisEventId}/clear`)
        .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
        .expect(403);
    });

    it('should allow therapist WITH MFA to clear crisis', async () => {
      // Create therapist token with mfaVerified = true
      const jwt = await import('jsonwebtoken');
      const { config } = await import('../../src/config/index');
      const mfaToken = jwt.default.sign(
        { sub: testData.therapistId, role: 'therapist', mfaVerified: true },
        config.JWT_SECRET,
        { expiresIn: '1h' } as jwt.SignOptions,
      );

      const res = await request(app)
        .put(`/api/v1/crisis/${crisisEventId}/clear`)
        .set('Authorization', `Bearer ${mfaToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('id', crisisEventId);
      expect(res.body).toHaveProperty('resolvedAt');
      expect(res.body.resolvedBy).toBe(testData.therapistId);
    });

    it('should reject clearing an already-resolved crisis', async () => {
      const jwt = await import('jsonwebtoken');
      const { config } = await import('../../src/config/index');
      const mfaToken = jwt.default.sign(
        { sub: testData.therapistId, role: 'therapist', mfaVerified: true },
        config.JWT_SECRET,
        { expiresIn: '1h' } as jwt.SignOptions,
      );

      await request(app)
        .put(`/api/v1/crisis/${crisisEventId}/clear`)
        .set('Authorization', `Bearer ${mfaToken}`)
        .expect(400);
    });
  });

  // ── Crisis Detection Cannot Be Bypassed ─────────────────

  describe('Crisis detection bypass protection', () => {
    it('should detect crisis regardless of content casing', async () => {
      const res = await request(app)
        .post('/api/v1/messages')
        .set('Authorization', `Bearer ${testData.patientToken}`)
        .send({
          content: 'I WANT TO KILL MYSELF',
          patientId: testData.patientId,
        })
        .expect(200);

      expect(res.body.crisis).toBe(true);
    });

    it('should detect crisis keyword embedded in longer text', async () => {
      const res = await request(app)
        .post('/api/v1/messages')
        .set('Authorization', `Bearer ${testData.patientToken}`)
        .send({
          content: 'Today was fine but honestly I want to end my life because nothing is changing',
          patientId: testData.patientId,
        })
        .expect(200);

      expect(res.body.crisis).toBe(true);
    });

    it('should always run crisis detection before message processing', async () => {
      // Send a crisis message — it should be caught BEFORE any rule engine processing
      const res = await request(app)
        .post('/api/v1/messages')
        .set('Authorization', `Bearer ${testData.patientToken}`)
        .send({
          content: 'I have a plan to end it all tonight',
          patientId: testData.patientId,
        })
        .expect(200);

      expect(res.body.crisis).toBe(true);
      // Should not have gone through the message pipeline
      expect(res.body).not.toHaveProperty('message');
    });
  });
});
