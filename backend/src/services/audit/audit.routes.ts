import { Router } from 'express';
import { authenticateToken, requireRole } from '../../middleware/auth';
import {
  patientAuditParamsSchema,
  auditQuerySchema,
  exportParamsSchema,
  exportQuerySchema,
} from './audit.schemas';
import {
  getPatientAuditTrail,
  getPracticeAuditLog,
  exportPatientAuditTrail,
} from './index';
import { logAudit } from '../../utils/audit';

const router = Router();

// All audit routes require therapist auth
router.use(authenticateToken, requireRole('therapist'));

/**
 * GET /api/v1/audit/:patientId — full audit trail for a patient
 */
router.get('/:patientId', async (req, res, next) => {
  try {
    const { patientId } = patientAuditParamsSchema.parse(req.params);
    const query = auditQuerySchema.parse(req.query);
    const therapistId = req.user!.sub;

    const result = await getPatientAuditTrail(patientId, therapistId, {
      limit: query.limit,
      offset: query.offset,
      action: query.action,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    });

    // Log that the audit was viewed
    await logAudit(therapistId, 'therapist', 'audit.view', 'patient', patientId);

    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/audit/export/:patientId — export audit trail as CSV or JSON
 */
router.get('/export/:patientId', async (req, res, next) => {
  try {
    const { patientId } = exportParamsSchema.parse(req.params);
    const { format } = exportQuerySchema.parse(req.query);
    const therapistId = req.user!.sub;

    const data = await exportPatientAuditTrail(patientId, therapistId, format);

    // Log the export
    await logAudit(therapistId, 'therapist', 'audit.export', 'patient', patientId, { format });

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="audit-${patientId}.csv"`);
      res.send(data);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="audit-${patientId}.json"`);
      res.send(data);
    }
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/audit/practice — practice-level audit log
 */
router.get('/practice/all', async (req, res, next) => {
  try {
    const query = auditQuerySchema.parse(req.query);
    const therapistId = req.user!.sub;

    const result = await getPracticeAuditLog(therapistId, {
      limit: query.limit,
      offset: query.offset,
      action: query.action,
      actorType: query.actorType,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
