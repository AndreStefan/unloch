import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/index';
import { prisma } from '../../src/config/prisma';
import { redis } from '../../src/config/redis';
import { seedTestData, cleanupTestData, createTestRule, TEST_PASSWORD } from '../helpers';

describe('Rule Engine Integration Tests', () => {
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

  // ── Rule Creation & Matching ────────────────────────────

  describe('Create rule → matching message → correct response', () => {
    beforeEach(async () => {
      // Clear rule response rate limiters
      const keys = await redis.keys('rule_resp:*');
      if (keys.length > 0) await redis.del(...keys);
    });

    it('should create a rule via API', async () => {
      const res = await request(app)
        .post('/api/v1/rules')
        .set('Authorization', `Bearer ${testData.therapistToken}`)
        .send({
          name: 'Anxiety Rule',
          triggerConfig: { keywords: ['anxious', 'anxiety'] },
          responseContent: 'Try the breathing exercise we discussed.',
          escalationLevel: 'informational',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('Anxiety Rule');
      expect(res.body.active).toBe(true);
      expect(res.body.version).toBe(1);
    });

    it('should match rule keyword and return rule response', async () => {
      // Ensure a rule exists
      await createTestRule(testData.therapistId, null, {
        name: 'Sleep Rule',
        keywords: ['insomnia', 'cant sleep'],
        response: 'Try the sleep hygiene tips we discussed.',
      });

      const res = await request(app)
        .post('/api/v1/messages')
        .set('Authorization', `Bearer ${testData.patientToken}`)
        .send({ content: 'I have terrible insomnia lately' })
        .expect(201);

      expect(res.body.response.messageType).toBe('rule_response');
      expect(res.body.response.content).toContain('sleep hygiene tips');
      expect(res.body.response.matchedRuleId).toBeTruthy();
      expect(res.body.response.confidenceScore).toBe(1.0);
    });

    it('should match case-insensitively', async () => {
      await createTestRule(testData.therapistId, null, {
        name: 'Stress Rule',
        keywords: ['stressed'],
        response: 'Remember our grounding techniques.',
      });

      const res = await request(app)
        .post('/api/v1/messages')
        .set('Authorization', `Bearer ${testData.patientToken}`)
        .send({ content: 'I am SO STRESSED about work' })
        .expect(201);

      expect(res.body.response.messageType).toBe('rule_response');
      expect(res.body.response.content).toContain('grounding techniques');
    });
  });

  // ── Non-Matching → Default Response ─────────────────────

  describe('Non-matching message → default response', () => {
    it('should return system default when no rule matches', async () => {
      const res = await request(app)
        .post('/api/v1/messages')
        .set('Authorization', `Bearer ${testData.patientToken}`)
        .send({ content: 'Today was a regular day, nothing special happened' })
        .expect(201);

      expect(res.body.response.messageType).toBe('system');
      expect(res.body.response.content).toContain('Dr. Test');
      expect(res.body.response.content).toContain('next session');
      expect(res.body.response.matchedRuleId).toBeNull();
    });
  });

  // ── Deactivated Rule ────────────────────────────────────

  describe('Deactivated rule → no match', () => {
    it('should not match a deactivated rule', async () => {
      // Create and then deactivate a rule
      const rule = await createTestRule(testData.therapistId, null, {
        name: 'Deactivated Rule',
        keywords: ['unique-deactivate-kw'],
        response: 'Should never appear.',
      });

      // Deactivate via API
      await request(app)
        .delete(`/api/v1/rules/${rule.id}`)
        .set('Authorization', `Bearer ${testData.therapistToken}`)
        .expect(200);

      // Clear rate limiter
      const keys = await redis.keys('rule_resp:*');
      if (keys.length > 0) await redis.del(...keys);

      // Send matching message
      const res = await request(app)
        .post('/api/v1/messages')
        .set('Authorization', `Bearer ${testData.patientToken}`)
        .send({ content: 'I feel unique-deactivate-kw today' })
        .expect(201);

      // Should get default response, not the deactivated rule
      expect(res.body.response.messageType).toBe('system');
      expect(res.body.response.content).not.toContain('Should never appear');
    });
  });

  // ── Priority Ordering ───────────────────────────────────

  describe('Multiple rules → priority ordering', () => {
    it('should match highest escalation priority rule first', async () => {
      const keyword = 'priority-test-kw';

      // Clear rate limiter
      const rlKeys = await redis.keys('rule_resp:*');
      if (rlKeys.length > 0) await redis.del(...rlKeys);

      // Create low-priority rule first
      await createTestRule(testData.therapistId, null, {
        name: 'Low Priority Rule',
        keywords: [keyword],
        response: 'Low priority response.',
        escalationLevel: 'informational',
      });

      // Create high-priority rule second
      await createTestRule(testData.therapistId, null, {
        name: 'High Priority Rule',
        keywords: [keyword],
        response: 'Urgent priority response.',
        escalationLevel: 'urgent',
      });

      // Create medium-priority rule third
      await createTestRule(testData.therapistId, null, {
        name: 'Medium Priority Rule',
        keywords: [keyword],
        response: 'Alert priority response.',
        escalationLevel: 'alert',
      });

      const res = await request(app)
        .post('/api/v1/messages')
        .set('Authorization', `Bearer ${testData.patientToken}`)
        .send({ content: `I feel ${keyword} today` })
        .expect(201);

      // Should match the urgent rule (highest escalation priority)
      expect(res.body.response.messageType).toBe('rule_response');
      expect(res.body.response.content).toContain('Urgent priority response');
    });
  });

  // ── Rate Limiting ───────────────────────────────────────

  describe('Rate limiting → 4th message gets default', () => {
    it('should rate-limit after 3 rule responses in 10 minutes', async () => {
      const keyword = 'rate-limit-test-kw';

      // Clear rate limiter
      const rlKeys = await redis.keys('rule_resp:*');
      if (rlKeys.length > 0) await redis.del(...rlKeys);

      await createTestRule(testData.therapistId, null, {
        name: 'Rate Limit Test Rule',
        keywords: [keyword],
        response: 'Rate limited response.',
      });

      // Send 3 messages — all should get rule responses
      for (let i = 0; i < 3; i++) {
        const res = await request(app)
          .post('/api/v1/messages')
          .set('Authorization', `Bearer ${testData.patientToken}`)
          .send({ content: `Message ${i} about ${keyword}` })
          .expect(201);

        expect(res.body.response.messageType).toBe('rule_response');
      }

      // 4th message — should get default response (rate limited)
      const res4 = await request(app)
        .post('/api/v1/messages')
        .set('Authorization', `Bearer ${testData.patientToken}`)
        .send({ content: `Message 4 about ${keyword}` })
        .expect(201);

      expect(res4.body.response.messageType).toBe('system');
      expect(res4.body.response.matchedRuleId).toBeNull();
    });
  });

  // ── Expired Rule ────────────────────────────────────────

  describe('Expired rule → not matched', () => {
    it('should not match an expired rule', async () => {
      const keyword = 'expired-rule-kw';

      // Clear rate limiter
      const rlKeys = await redis.keys('rule_resp:*');
      if (rlKeys.length > 0) await redis.del(...rlKeys);

      // Create a rule that expired in the past
      await createTestRule(testData.therapistId, null, {
        name: 'Expired Rule',
        keywords: [keyword],
        response: 'Expired response should not appear.',
        expiresAt: new Date(Date.now() - 86400000), // 1 day ago
      });

      const res = await request(app)
        .post('/api/v1/messages')
        .set('Authorization', `Bearer ${testData.patientToken}`)
        .send({ content: `I feel ${keyword} today` })
        .expect(201);

      // Should get default response since the rule is expired
      expect(res.body.response.messageType).toBe('system');
      expect(res.body.response.content).not.toContain('Expired response');
    });
  });

  // ── Rule Test Simulation ────────────────────────────────

  describe('Rule test endpoint', () => {
    it('should test rule without affecting rate limiter', async () => {
      const rule = await createTestRule(testData.therapistId, null, {
        name: 'Test Sim Rule',
        keywords: ['sim-keyword'],
        response: 'Simulation response.',
      });

      const res = await request(app)
        .post(`/api/v1/rules/${rule.id}/test`)
        .set('Authorization', `Bearer ${testData.therapistToken}`)
        .send({ testMessage: 'Does sim-keyword match?' })
        .expect(200);

      expect(res.body.wouldMatch).toBe(true);
      expect(res.body.matchedKeywords).toContain('sim-keyword');
      expect(res.body.responseContent).toBe('Simulation response.');
    });

    it('should report no match for non-matching test', async () => {
      const rule = await createTestRule(testData.therapistId, null, {
        name: 'No Match Sim',
        keywords: ['very-specific-kw'],
        response: 'Specific response.',
      });

      const res = await request(app)
        .post(`/api/v1/rules/${rule.id}/test`)
        .set('Authorization', `Bearer ${testData.therapistToken}`)
        .send({ testMessage: 'Hello world, nothing special' })
        .expect(200);

      expect(res.body.wouldMatch).toBe(false);
      expect(res.body.matchedKeywords).toHaveLength(0);
    });
  });
});
