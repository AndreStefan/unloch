import { z } from 'zod';

export const getAlertsQuerySchema = z.object({
  status: z.enum(['open', 'resolved']).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional(),
});

export const alertIdParamsSchema = z.object({
  id: z.string().uuid(),
});
