import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/[0-9]/, 'Password must contain a number'),
  name: z.string().min(1).max(200),
  practiceName: z.string().min(1).max(200),
  licenseType: z.string().max(100).optional(),
  licenseState: z.string().max(2).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().uuid(),
});

export const mfaVerifySchema = z.object({
  mfaToken: z.string().min(1),
  code: z.string().length(6, 'MFA code must be 6 digits').regex(/^\d+$/, 'MFA code must be numeric'),
});

export const patientLoginSchema = z.object({
  email: z.string().email(),
});

export const patientVerifyParamsSchema = z.object({
  token: z.string().uuid(),
});
