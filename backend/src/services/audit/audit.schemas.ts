import { z } from 'zod';

export const patientAuditParamsSchema = z.object({
  patientId: z.string().uuid(),
});

export const auditQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  action: z.string().optional(),
  actorType: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const exportParamsSchema = z.object({
  patientId: z.string().uuid(),
});

export const exportQuerySchema = z.object({
  format: z.enum(['json', 'csv']).default('json'),
});
