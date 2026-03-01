import { z } from 'zod';

export const clearCrisisParamsSchema = z.object({
  id: z.string().uuid(),
});

export const crisisEventsParamsSchema = z.object({
  patientId: z.string().uuid(),
});
