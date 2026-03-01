import { z } from 'zod';

export const sendMessageSchema = z.object({
  content: z.string().min(1).max(5000),
});

export const messageHistoryParamsSchema = z.object({
  patientId: z.string().uuid(),
});

export const messageHistoryQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional(),
  before: z.string().datetime().optional(),
});
