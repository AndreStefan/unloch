import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { authenticator } from 'otplib';
import { app } from '../../src/index';
import { prisma } from '../../src/config/prisma';
import { redis } from '../../src/config/redis';
import { seedTestData, cleanupTestData, TEST_PASSWORD } from '../helpers';

/**
 * Flush rate-limiter keys so tests don't cross-contaminate.
 */
async function flushRateLimiters() {
  const keys = await redis.keys('rl:*');
  if (keys.length > 0) await redis.del(...keys);
}

describe('Auth Integration Tests', () => {
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

  // Flush rate limiters before EVERY test to prevent cross-contamination
  beforeEach(async () => {
    await flushRateLimiters();
  });

  // ── Register → Login → Protected Route ─────────────────

  describe('Register → Login → Protected Route', () => {
    const testEmail = 'register-test@test.com';

    it('should register a new therapist and return user info', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: testEmail,
          password: 'SecurePass123',
          name: 'Dr. Register',
          practiceName: 'Register Practice',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.email).toBe(testEmail);
      expect(res.body.name).toBe('Dr. Register');
      expect(res.body.practiceName).toBe('Register Practice');
      expect(res.body).toHaveProperty('practiceId');
      // Should not return password
      expect(res.body).not.toHaveProperty('password');
      expect(res.body).not.toHaveProperty('passwordHash');
    });

    it('should login with registered credentials and receive tokens', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testEmail, password: 'SecurePass123' })
        .expect(200);

      expect(res.body.mfaRequired).toBe(false);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body.user.email).toBe(testEmail);
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user).toHaveProperty('name');
    });

    it('should access a protected route with valid JWT', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testEmail, password: 'SecurePass123' });

      const res = await request(app)
        .get('/api/v1/rules')
        .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should reject access without a token', async () => {
      await request(app)
        .get('/api/v1/rules')
        .expect(401);
    });

    it('should reject access with malformed token', async () => {
      await request(app)
        .get('/api/v1/rules')
        .set('Authorization', 'Bearer invalid-token-here')
        .expect(401);
    });

    it('should reject duplicate email registration', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: testEmail,
          password: 'SecurePass123',
          name: 'Dr. Dup',
          practiceName: 'Dup Practice',
        })
        .expect(409);

      expect(res.body.code).toBe('EMAIL_EXISTS');
    });
  });

  // ── Invalid Credentials ─────────────────────────────────

  describe('Invalid Credentials', () => {
    it('should return 401 for wrong password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testData.therapistEmail, password: 'WrongPass999' })
        .expect(401);

      expect(res.body.code).toBe('INVALID_CREDENTIALS');
    });

    it('should return 401 for non-existent email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'no-such-user@test.com', password: 'AnyPass123' })
        .expect(401);

      expect(res.body.code).toBe('INVALID_CREDENTIALS');
    });

    it('should return 401 for each failed login attempt', async () => {
      // Test that repeated failures all produce 401 (not reveal info)
      for (let i = 0; i < 3; i++) {
        await flushRateLimiters(); // flush between attempts to avoid rate limit
        const res = await request(app)
          .post('/api/v1/auth/login')
          .send({ email: testData.therapistEmail, password: `Wrong${i}Pass1` })
          .expect(401);

        expect(res.body.code).toBe('INVALID_CREDENTIALS');
      }
    });
  });

  // ── Token Refresh ───────────────────────────────────────

  describe('Token Refresh', () => {
    it('should refresh access token with valid refresh token', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testData.therapistEmail, password: TEST_PASSWORD })
        .expect(200);

      const { refreshToken } = loginRes.body;

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      // Rotation: new refresh token differs from old
      expect(res.body.refreshToken).not.toBe(refreshToken);
    });

    it('should allow protected access with refreshed token', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testData.therapistEmail, password: TEST_PASSWORD })
        .expect(200);

      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: loginRes.body.refreshToken })
        .expect(200);

      // Use the new access token
      await request(app)
        .get('/api/v1/rules')
        .set('Authorization', `Bearer ${refreshRes.body.accessToken}`)
        .expect(200);
    });

    it('should reject reuse of old refresh token (rotation)', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testData.therapistEmail, password: TEST_PASSWORD })
        .expect(200);

      const oldRefreshToken = loginRes.body.refreshToken;

      // First refresh works
      await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: oldRefreshToken })
        .expect(200);

      // Re-using old token fails
      await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: oldRefreshToken })
        .expect(401);
    });

    it('should reject invalid refresh token', async () => {
      await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: '00000000-0000-0000-0000-000000000000' })
        .expect(401);
    });
  });

  // ── Patient Magic Link Flow ─────────────────────────────

  describe('Patient Magic Link Flow', () => {
    beforeEach(async () => {
      // Clear any existing magic link tokens AND rate limiters
      const magicKeys = await redis.keys('magic:*');
      if (magicKeys.length > 0) await redis.del(...magicKeys);
    });

    it('should request magic link for existing patient', async () => {
      const res = await request(app)
        .post('/api/v1/auth/patient/login')
        .send({ email: testData.patientEmail })
        .expect(200);

      expect(res.body.message).toContain('If an account exists');
    });

    it('should return same message for non-existent email (no info leak)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/patient/login')
        .send({ email: 'ghost@test.com' })
        .expect(200);

      expect(res.body.message).toContain('If an account exists');
    });

    it('should verify magic link token and return JWT', async () => {
      // Request magic link
      await request(app)
        .post('/api/v1/auth/patient/login')
        .send({ email: testData.patientEmail });

      // Find the token in Redis
      const keys = await redis.keys('magic:*');
      expect(keys.length).toBeGreaterThan(0);
      const token = keys[0].replace('magic:', '');

      // Verify
      const res = await request(app)
        .get(`/api/v1/auth/patient/verify/${token}`)
        .expect(200);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body.user.email).toBe(testData.patientEmail);
      expect(res.body.user.id).toBe(testData.patientId);
    });

    it('should reject reuse of magic link (one-time use)', async () => {
      await request(app)
        .post('/api/v1/auth/patient/login')
        .send({ email: testData.patientEmail });

      const keys = await redis.keys('magic:*');
      expect(keys.length).toBeGreaterThan(0);
      const token = keys[0].replace('magic:', '');

      // First use
      await request(app)
        .get(`/api/v1/auth/patient/verify/${token}`)
        .expect(200);

      // Second use — rejected
      await request(app)
        .get(`/api/v1/auth/patient/verify/${token}`)
        .expect(401);
    });

    it('should reject invalid magic link token', async () => {
      await request(app)
        .get('/api/v1/auth/patient/verify/00000000-0000-0000-0000-000000000000')
        .expect(401);
    });
  });

  // ── MFA Setup and Verification ──────────────────────────

  describe('MFA Setup and Verification', () => {
    let mfaSecret: string;

    it('should setup MFA for therapist', async () => {
      // Reset MFA state first
      await prisma.therapist.update({
        where: { id: testData.therapistId },
        data: { mfaEnabled: false, mfaSecret: null },
      });

      const res = await request(app)
        .post('/api/v1/auth/mfa/setup')
        .set('Authorization', `Bearer ${testData.therapistToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('secret');
      expect(res.body).toHaveProperty('otpauthUrl');
      expect(res.body.otpauthUrl).toContain('otpauth://');
      mfaSecret = res.body.secret;
    });

    it('should reject duplicate MFA setup', async () => {
      // Enable MFA to trigger the guard
      await prisma.therapist.update({
        where: { id: testData.therapistId },
        data: { mfaEnabled: true },
      });

      await request(app)
        .post('/api/v1/auth/mfa/setup')
        .set('Authorization', `Bearer ${testData.therapistToken}`)
        .expect(400);
    });

    it('should complete full MFA login flow', async () => {
      // Ensure MFA is enabled with secret from setup test
      await prisma.therapist.update({
        where: { id: testData.therapistId },
        data: { mfaEnabled: true },
      });

      // Login — should require MFA
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testData.therapistEmail, password: TEST_PASSWORD })
        .expect(200);

      expect(loginRes.body.mfaRequired).toBe(true);
      expect(loginRes.body).toHaveProperty('mfaToken');
      expect(loginRes.body).not.toHaveProperty('accessToken');

      // Generate valid TOTP code
      const code = authenticator.generate(mfaSecret);

      // Verify MFA
      const verifyRes = await request(app)
        .post('/api/v1/auth/mfa/verify')
        .send({ mfaToken: loginRes.body.mfaToken, code })
        .expect(200);

      expect(verifyRes.body).toHaveProperty('accessToken');
      expect(verifyRes.body).toHaveProperty('refreshToken');
      expect(verifyRes.body.user.id).toBe(testData.therapistId);
      expect(verifyRes.body.user.email).toBe(testData.therapistEmail);
    });

    it('should reject invalid MFA code', async () => {
      // Login to get mfaToken
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testData.therapistEmail, password: TEST_PASSWORD })
        .expect(200);

      expect(loginRes.body.mfaRequired).toBe(true);

      const res = await request(app)
        .post('/api/v1/auth/mfa/verify')
        .send({ mfaToken: loginRes.body.mfaToken, code: '000000' });

      // Service returns 401 UnauthorizedError for invalid MFA code
      expect(res.status).toBe(401);
    });

    it('should reject expired MFA token', async () => {
      // Create an expired MFA token
      const jwt = await import('jsonwebtoken');
      const { config } = await import('../../src/config/index');
      const expiredToken = jwt.default.sign(
        { sub: testData.therapistId, role: 'therapist', mfaPending: true },
        config.JWT_SECRET,
        { expiresIn: '0s' } as jwt.SignOptions,
      );

      // Small delay to ensure expiry
      await new Promise((r) => setTimeout(r, 100));

      const code = authenticator.generate(mfaSecret);

      await request(app)
        .post('/api/v1/auth/mfa/verify')
        .send({ mfaToken: expiredToken, code })
        .expect(401);
    });
  });
});
