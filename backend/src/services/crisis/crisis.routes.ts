import { Router, Request, Response, NextFunction } from 'express';
import { validateParams } from '../../middleware/validate';
import { authenticateToken, requireRole, requireMFA } from '../../middleware/auth';
import { logAudit } from '../../utils/audit';
import { clearCrisisParamsSchema, crisisEventsParamsSchema } from './crisis.schemas';
import { clearCrisis, getCrisisEvents } from './index';

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);
}

// PUT /api/v1/crisis/:id/clear — therapist clears a crisis event
router.put(
  '/:id/clear',
  authenticateToken,
  requireRole('therapist'),
  requireMFA,
  validateParams(clearCrisisParamsSchema),
  asyncHandler(async (req, res) => {
    const result = await clearCrisis(req.params.id, req.user!.sub);
    await logAudit(
      req.user!.sub,
      'therapist',
      'crisis.clear.route',
      'crisis_event',
      req.params.id,
      undefined,
      req.ip,
    );
    res.json({ id: result.id, resolvedAt: result.resolvedAt, resolvedBy: result.resolvedBy });
  }),
);

// GET /api/v1/crisis/events/:patientId — crisis history for a patient
router.get(
  '/events/:patientId',
  authenticateToken,
  requireRole('therapist'),
  validateParams(crisisEventsParamsSchema),
  asyncHandler(async (req, res) => {
    const events = await getCrisisEvents(req.params.patientId, req.user!.sub);
    await logAudit(
      req.user!.sub,
      'therapist',
      'crisis.events.viewed',
      'patient',
      req.params.patientId,
      undefined,
      req.ip,
    );
    res.json(events);
  }),
);

export default router;
