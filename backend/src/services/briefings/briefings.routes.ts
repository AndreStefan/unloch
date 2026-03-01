import { Router } from 'express';
import { authenticateToken, requireRole } from '../../middleware/auth';
import { validate, validateParams } from '../../middleware/validate';
import {
  patientIdParamsSchema,
  generateBriefingSchema,
  briefingIdParamsSchema,
  briefingsQuerySchema,
} from './briefings.schemas';
import { generateBriefing, getBriefing, getBriefingsForPatient } from './index';
import { exportPatientData, generateReadableSummary } from '../patients/export';

const router = Router();

// All briefing routes require therapist auth
router.use(authenticateToken, requireRole('therapist'));

/**
 * POST /api/v1/patients/:id/briefing/generate
 * Manually trigger briefing generation for a patient.
 */
router.post(
  '/:id/briefing/generate',
  validateParams(patientIdParamsSchema),
  validate(generateBriefingSchema),
  async (req, res, next) => {
    try {
      const { id: patientId } = req.params;
      const therapistId = req.user!.sub;
      const sessionDate = req.body.sessionDate ? new Date(req.body.sessionDate) : undefined;

      const briefing = await generateBriefing(patientId, therapistId, sessionDate);
      res.status(201).json(briefing);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/patients/:id/briefing
 * Get the latest briefing for a patient.
 */
router.get(
  '/:id/briefing',
  validateParams(patientIdParamsSchema),
  async (req, res, next) => {
    try {
      const { id: patientId } = req.params;
      const therapistId = req.user!.sub;

      const result = await getBriefingsForPatient(patientId, therapistId, 1, 0);
      if (result.briefings.length === 0) {
        res.json({ briefing: null });
        return;
      }
      res.json({ briefing: result.briefings[0] });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/patients/:id/briefings
 * Get all briefings for a patient (paginated).
 */
router.get(
  '/:id/briefings',
  validateParams(patientIdParamsSchema),
  async (req, res, next) => {
    try {
      const { id: patientId } = req.params;
      const therapistId = req.user!.sub;
      const { limit, offset } = briefingsQuerySchema.parse(req.query);

      const result = await getBriefingsForPatient(patientId, therapistId, limit, offset);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/patients/:id/briefings/:briefingId
 * Get a specific briefing.
 */
router.get(
  '/:id/briefings/:briefingId',
  async (req, res, next) => {
    try {
      const { briefingId } = briefingIdParamsSchema.parse(req.params);
      const therapistId = req.user!.sub;

      const briefing = await getBriefing(briefingId, therapistId);
      res.json(briefing);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/patients/:id/export
 * Full data export for a patient (JSON or text).
 */
router.get(
  '/:id/export',
  validateParams(patientIdParamsSchema),
  async (req, res, next) => {
    try {
      const { id: patientId } = req.params;
      const therapistId = req.user!.sub;
      const format = (req.query.format as string) || 'json';

      const data = await exportPatientData(patientId, therapistId);

      if (format === 'text') {
        const text = generateReadableSummary(data);
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename="patient-export-${patientId}.txt"`);
        res.send(text);
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="patient-export-${patientId}.json"`);
        res.json(data);
      }
    } catch (err) {
      next(err);
    }
  }
);

export default router;
