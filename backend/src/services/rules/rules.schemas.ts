import { z } from 'zod';

export const createRuleSchema = z.object({
  name: z.string().min(1).max(200),
  triggerConfig: z.object({
    keywords: z.array(z.string().min(1)).min(1, 'At least one keyword required'),
    patterns: z.array(z.string()).optional(),
  }),
  responseContent: z.string().min(1).max(2000),
  attribution: z.string().max(200).optional(),
  escalationLevel: z.enum(['informational', 'alert', 'urgent']).optional(),
  patientId: z.string().uuid().optional(),
  expiresAt: z.string().datetime().optional(),
});

export const updateRuleSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  triggerConfig: z
    .object({
      keywords: z.array(z.string().min(1)).min(1),
      patterns: z.array(z.string()).optional(),
    })
    .optional(),
  responseContent: z.string().min(1).max(2000).optional(),
  attribution: z.string().max(200).optional(),
  escalationLevel: z.enum(['informational', 'alert', 'urgent']).optional(),
  patientId: z.string().uuid().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

export const ruleIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const testRuleSchema = z.object({
  testMessage: z.string().min(1).max(2000),
});
