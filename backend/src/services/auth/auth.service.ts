import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { authenticator } from 'otplib';
import { prisma } from '../../config/prisma';
import { redis } from '../../config/redis';
import { config } from '../../config/index';
import { TokenPayload } from '../../middleware/auth';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from '../../utils/errors';

const BCRYPT_ROUNDS = 12;
const REFRESH_PREFIX = 'refresh:';
const MAGIC_LINK_PREFIX = 'magic:';
const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
const MAGIC_LINK_TTL_SECONDS = 15 * 60; // 15 minutes

function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_ACCESS_EXPIRY as string,
  } as jwt.SignOptions);
}

function signRefreshToken(): string {
  return uuidv4();
}

// ─── Therapist Auth ────────────────────────────────────

export async function registerTherapist(data: {
  email: string;
  password: string;
  name: string;
  practiceName: string;
  licenseType?: string;
  licenseState?: string;
}) {
  const existing = await prisma.therapist.findUnique({ where: { email: data.email } });
  if (existing) {
    throw new ConflictError('Email already registered', 'EMAIL_EXISTS');
  }

  const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

  const result = await prisma.$transaction(async (tx) => {
    const practice = await tx.practice.create({
      data: { name: data.practiceName },
    });

    const therapist = await tx.therapist.create({
      data: {
        practiceId: practice.id,
        email: data.email,
        passwordHash,
        name: data.name,
        licenseType: data.licenseType,
        licenseState: data.licenseState,
      },
    });

    return { therapist, practice };
  });

  return {
    id: result.therapist.id,
    email: result.therapist.email,
    name: result.therapist.name,
    practiceId: result.practice.id,
    practiceName: result.practice.name,
  };
}

export async function loginTherapist(email: string, password: string) {
  const therapist = await prisma.therapist.findUnique({ where: { email } });
  if (!therapist) {
    throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  const valid = await bcrypt.compare(password, therapist.passwordHash);
  if (!valid) {
    throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  // If MFA is enabled, return partial auth — client must call /mfa/verify next
  if (therapist.mfaEnabled) {
    const mfaPendingToken = jwt.sign(
      { sub: therapist.id, role: 'therapist', mfaPending: true },
      config.JWT_SECRET,
      { expiresIn: '5m' } as jwt.SignOptions,
    );
    return { mfaRequired: true, mfaToken: mfaPendingToken };
  }

  const accessToken = signAccessToken({ sub: therapist.id, role: 'therapist', mfaVerified: false });
  const refreshToken = signRefreshToken();
  await redis.set(`${REFRESH_PREFIX}${refreshToken}`, therapist.id, 'EX', REFRESH_TTL_SECONDS);

  return {
    mfaRequired: false,
    accessToken,
    refreshToken,
    user: {
      id: therapist.id,
      email: therapist.email,
      name: therapist.name,
    },
  };
}

export async function refreshAccessToken(refreshToken: string) {
  const therapistId = await redis.get(`${REFRESH_PREFIX}${refreshToken}`);
  if (!therapistId) {
    throw new UnauthorizedError('Invalid or expired refresh token', 'INVALID_REFRESH');
  }

  // Rotation: delete old, issue new
  await redis.del(`${REFRESH_PREFIX}${refreshToken}`);

  const therapist = await prisma.therapist.findUnique({ where: { id: therapistId } });
  if (!therapist) {
    throw new UnauthorizedError('User not found', 'USER_NOT_FOUND');
  }

  const newAccessToken = signAccessToken({
    sub: therapist.id,
    role: 'therapist',
    mfaVerified: therapist.mfaEnabled,
  });
  const newRefreshToken = signRefreshToken();
  await redis.set(`${REFRESH_PREFIX}${newRefreshToken}`, therapist.id, 'EX', REFRESH_TTL_SECONDS);

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

// ─── MFA ───────────────────────────────────────────────

export async function setupMFA(therapistId: string) {
  const therapist = await prisma.therapist.findUnique({ where: { id: therapistId } });
  if (!therapist) throw new NotFoundError('Therapist not found');
  if (therapist.mfaEnabled) throw new BadRequestError('MFA is already enabled', 'MFA_ALREADY_ENABLED');

  const secret = authenticator.generateSecret();
  await prisma.therapist.update({
    where: { id: therapistId },
    data: { mfaSecret: secret },
  });

  const otpauthUrl = authenticator.keyuri(therapist.email, 'Unloch', secret);

  return { secret, otpauthUrl };
}

export async function verifyMFA(mfaToken: string, code: string) {
  let payload: { sub: string; mfaPending?: boolean };
  try {
    payload = jwt.verify(mfaToken, config.JWT_SECRET) as typeof payload;
  } catch {
    throw new UnauthorizedError('Invalid or expired MFA token', 'INVALID_MFA_TOKEN');
  }

  if (!payload.mfaPending) {
    throw new BadRequestError('Token is not an MFA-pending token', 'INVALID_TOKEN_TYPE');
  }

  const therapist = await prisma.therapist.findUnique({ where: { id: payload.sub } });
  if (!therapist || !therapist.mfaSecret) {
    throw new NotFoundError('Therapist or MFA secret not found');
  }

  const valid = authenticator.check(code, therapist.mfaSecret);
  if (!valid) {
    throw new UnauthorizedError('Invalid MFA code', 'INVALID_MFA_CODE');
  }

  // Enable MFA on first successful verify if not yet enabled
  if (!therapist.mfaEnabled) {
    await prisma.therapist.update({
      where: { id: therapist.id },
      data: { mfaEnabled: true },
    });
  }

  const accessToken = signAccessToken({ sub: therapist.id, role: 'therapist', mfaVerified: true });
  const refreshToken = signRefreshToken();
  await redis.set(`${REFRESH_PREFIX}${refreshToken}`, therapist.id, 'EX', REFRESH_TTL_SECONDS);

  return {
    accessToken,
    refreshToken,
    user: {
      id: therapist.id,
      email: therapist.email,
      name: therapist.name,
    },
  };
}

// ─── Patient Auth (Magic Link) ─────────────────────────

export async function requestPatientMagicLink(email: string) {
  const patient = await prisma.patient.findUnique({ where: { email } });
  if (!patient) {
    // Don't reveal whether account exists
    return { message: 'If an account exists, a login link has been sent.' };
  }

  const token = uuidv4();
  await redis.set(`${MAGIC_LINK_PREFIX}${token}`, patient.id, 'EX', MAGIC_LINK_TTL_SECONDS);

  // In production this would send an email via SendGrid/SES.
  // For MVP, log the link.
  const link = `${process.env.PATIENT_APP_URL || 'http://localhost:3001'}/auth/verify/${token}`;
  console.log(`[Magic Link] Patient ${patient.email}: ${link}`);

  const response: { message: string; devToken?: string } = {
    message: 'If an account exists, a login link has been sent.',
  };

  // In development or demo mode, return the token so the frontend can bypass email
  if (process.env.NODE_ENV !== 'production' || process.env.DEMO_MODE === 'true') {
    response.devToken = token;
  }

  return response;
}

export async function verifyPatientMagicLink(token: string) {
  const patientId = await redis.get(`${MAGIC_LINK_PREFIX}${token}`);
  if (!patientId) {
    throw new UnauthorizedError('Invalid or expired magic link', 'INVALID_MAGIC_LINK');
  }

  // One-time use: delete immediately
  await redis.del(`${MAGIC_LINK_PREFIX}${token}`);

  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) {
    throw new NotFoundError('Patient not found');
  }

  const accessToken = signAccessToken({ sub: patient.id, role: 'patient' });
  const refreshToken = signRefreshToken();
  await redis.set(`${REFRESH_PREFIX}${refreshToken}`, patient.id, 'EX', REFRESH_TTL_SECONDS);

  return {
    accessToken,
    refreshToken,
    user: {
      id: patient.id,
      email: patient.email,
      name: patient.name,
    },
  };
}
