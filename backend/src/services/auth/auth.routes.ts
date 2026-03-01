import { Router, Request, Response, NextFunction } from 'express';
import { validate, validateParams } from '../../middleware/validate';
import { loginRateLimit } from '../../middleware/rateLimiter';
import { authenticateToken } from '../../middleware/auth';
import { logAudit } from '../../utils/audit';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  mfaVerifySchema,
  patientLoginSchema,
  patientVerifyParamsSchema,
} from './auth.schemas';
import * as authService from './auth.service';

const router = Router();

// Wrap async route handlers so thrown errors reach the error middleware
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);
}

// ─── Therapist Registration ────────────────────────────

router.post(
  '/register',
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.registerTherapist(req.body);
    await logAudit(result.id, 'therapist', 'auth.register', 'therapist', result.id, undefined, req.ip);
    res.status(201).json(result);
  }),
);

// ─── Therapist Login ───────────────────────────────────

router.post(
  '/login',
  loginRateLimit,
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.loginTherapist(req.body.email, req.body.password);

    const actorId = result.mfaRequired ? 'unknown' : result.user!.id;
    await logAudit(
      actorId,
      'therapist',
      result.mfaRequired ? 'auth.login.mfa_pending' : 'auth.login',
      'therapist',
      actorId,
      { mfaRequired: result.mfaRequired },
      req.ip,
    );

    res.json(result);
  }),
);

// ─── Refresh Token ─────────────────────────────────────

router.post(
  '/refresh',
  validate(refreshSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.refreshAccessToken(req.body.refreshToken);
    // We don't have the user id readily from the refresh token route input,
    // but the service already validated it. Log with system actor.
    await logAudit('system', 'system', 'auth.refresh', 'token', 'refresh', undefined, req.ip);
    res.json(result);
  }),
);

// ─── MFA Setup ─────────────────────────────────────────

router.post(
  '/mfa/setup',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await authService.setupMFA(req.user!.sub);
    await logAudit(req.user!.sub, 'therapist', 'auth.mfa.setup', 'therapist', req.user!.sub, undefined, req.ip);
    res.json(result);
  }),
);

// ─── MFA Verify ────────────────────────────────────────

router.post(
  '/mfa/verify',
  validate(mfaVerifySchema),
  asyncHandler(async (req, res) => {
    const result = await authService.verifyMFA(req.body.mfaToken, req.body.code);
    await logAudit(result.user.id, 'therapist', 'auth.mfa.verify', 'therapist', result.user.id, undefined, req.ip);
    res.json(result);
  }),
);

// ─── Patient Magic Link Login ──────────────────────────

router.post(
  '/patient/login',
  loginRateLimit,
  validate(patientLoginSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.requestPatientMagicLink(req.body.email);
    await logAudit('system', 'system', 'auth.patient.magic_link_requested', 'patient', 'email', { email: req.body.email }, req.ip);
    res.json(result);
  }),
);

// ─── Patient Magic Link Verify ─────────────────────────

router.get(
  '/patient/verify/:token',
  validateParams(patientVerifyParamsSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.verifyPatientMagicLink(req.params.token);
    await logAudit(result.user.id, 'patient', 'auth.patient.verified', 'patient', result.user.id, undefined, req.ip);
    res.json(result);
  }),
);

export default router;
