import { Router, Request, Response, NextFunction } from 'express';
import { validate, validateParams } from '../../middleware/validate';
import { authenticateToken } from '../../middleware/auth';
import { logAudit } from '../../utils/audit';
import { ForbiddenError } from '../../utils/errors';
import { prisma } from '../../config/prisma';
import {
  sendMessageSchema,
  messageHistoryParamsSchema,
  messageHistoryQuerySchema,
} from './messages.schemas';
import { processMessage } from './pipeline';

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);
}

// POST /api/v1/messages — patient sends a message
// Note: crisis detection middleware runs BEFORE this route handler in index.ts
router.post(
  '/',
  authenticateToken,
  validate(sendMessageSchema),
  asyncHandler(async (req, res) => {
    if (req.user!.role !== 'patient') {
      throw new ForbiddenError('Only patients can send messages');
    }

    const result = await processMessage(req.user!.sub, req.body.content);

    await logAudit(
      req.user!.sub,
      'patient',
      'message.sent',
      'message',
      result.message.id,
      undefined,
      req.ip,
    );

    res.status(201).json(result);
  }),
);

// GET /api/v1/messages/:patientId — conversation history
// Patient can see own messages; therapist can see their patients' messages
router.get(
  '/:patientId',
  authenticateToken,
  validateParams(messageHistoryParamsSchema),
  asyncHandler(async (req, res) => {
    const { patientId } = req.params;
    const query = messageHistoryQuerySchema.parse(req.query);

    // Authorization: patient sees own, therapist sees their patients'
    if (req.user!.role === 'patient' && req.user!.sub !== patientId) {
      throw new ForbiddenError('Cannot view other patients\' messages');
    }

    if (req.user!.role === 'therapist') {
      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        select: { therapistId: true },
      });
      if (!patient || patient.therapistId !== req.user!.sub) {
        throw new ForbiddenError('Patient is not assigned to you');
      }
    }

    const limit = query.limit || 50;
    const where: { patientId: string; createdAt?: { lt: Date } } = { patientId };
    if (query.before) {
      where.createdAt = { lt: new Date(query.before) };
    }

    const messages = await prisma.message.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        direction: true,
        content: true,
        messageType: true,
        matchedRuleId: true,
        confidenceScore: true,
        createdAt: true,
      },
    });

    await logAudit(
      req.user!.sub,
      req.user!.role,
      'message.history.viewed',
      'patient',
      patientId,
      { count: messages.length },
      req.ip,
    );

    res.json({ messages, hasMore: messages.length === limit });
  }),
);

export default router;
