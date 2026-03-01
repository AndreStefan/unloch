import { Router, Request, Response, NextFunction } from 'express';
import { validateParams } from '../../middleware/validate';
import { authenticateToken, requireRole } from '../../middleware/auth';
import { logAudit } from '../../utils/audit';
import { getAlertsQuerySchema, alertIdParamsSchema } from './alerts.schemas';
import { getAlerts, resolveAlert } from './index';

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);
}

router.use(authenticateToken, requireRole('therapist'));

// GET /api/v1/alerts
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = getAlertsQuerySchema.parse(req.query);
    const result = await getAlerts(req.user!.sub, query);
    await logAudit(req.user!.sub, 'therapist', 'alert.list', 'alert', 'all', undefined, req.ip);
    res.json(result);
  }),
);

// PUT /api/v1/alerts/:id/resolve
router.put(
  '/:id/resolve',
  validateParams(alertIdParamsSchema),
  asyncHandler(async (req, res) => {
    const result = await resolveAlert(req.params.id, req.user!.sub);
    res.json({ id: result.id, status: result.status, resolvedAt: result.resolvedAt });
  }),
);

export default router;
