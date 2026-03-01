import { z } from 'zod';

export const patientIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const generateBriefingSchema = z.object({
  sessionDate: z.string().datetime().optional(),
});

export const briefingIdParamsSchema = z.object({
  id: z.string().uuid(),
  briefingId: z.string().uuid(),
});

export const briefingsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
  offset: z.coerce.number().int().min(0).default(0),
});
