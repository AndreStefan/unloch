import { Router, Request, Response, NextFunction } from 'express';
import { validate, validateParams } from '../../middleware/validate';
import { authenticateToken, requireRole } from '../../middleware/auth';
import { logAudit } from '../../utils/audit';
import {
  createRuleSchema,
  updateRuleSchema,
  ruleIdParamsSchema,
  testRuleSchema,
} from './rules.schemas';
import {
  createRule,
  updateRule,
  deactivateRule,
  getRulesForTherapist,
  getRuleDetail,
  testRuleMatch,
} from './index';

const router = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);
}

// All rule routes require authenticated therapist
router.use(authenticateToken, requireRole('therapist'));

// GET /api/v1/rules — list all rules for authenticated therapist
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const rules = await getRulesForTherapist(req.user!.sub);
    await logAudit(req.user!.sub, 'therapist', 'rule.list', 'rule', 'all', undefined, req.ip);
    res.json(rules);
  }),
);

// GET /api/v1/rules/:id — rule detail with version history
router.get(
  '/:id',
  validateParams(ruleIdParamsSchema),
  asyncHandler(async (req, res) => {
    const rule = await getRuleDetail(req.params.id, req.user!.sub);
    await logAudit(req.user!.sub, 'therapist', 'rule.view', 'rule', req.params.id, undefined, req.ip);
    res.json(rule);
  }),
);

// POST /api/v1/rules — create new rule
router.post(
  '/',
  validate(createRuleSchema),
  asyncHandler(async (req, res) => {
    const rule = await createRule(req.user!.sub, req.body);
    res.status(201).json(rule);
  }),
);

// PUT /api/v1/rules/:id — update rule (new version)
router.put(
  '/:id',
  validateParams(ruleIdParamsSchema),
  validate(updateRuleSchema),
  asyncHandler(async (req, res) => {
    const rule = await updateRule(req.params.id, req.user!.sub, req.body);
    res.json(rule);
  }),
);

// DELETE /api/v1/rules/:id — deactivate rule
router.delete(
  '/:id',
  validateParams(ruleIdParamsSchema),
  asyncHandler(async (req, res) => {
    const rule = await deactivateRule(req.params.id, req.user!.sub);
    res.json(rule);
  }),
);

// POST /api/v1/rules/:id/test — simulate message against rule
router.post(
  '/:id/test',
  validateParams(ruleIdParamsSchema),
  validate(testRuleSchema),
  asyncHandler(async (req, res) => {
    const result = await testRuleMatch(req.params.id, req.user!.sub, req.body.testMessage);
    await logAudit(req.user!.sub, 'therapist', 'rule.test', 'rule', req.params.id, { testMessage: req.body.testMessage }, req.ip);
    res.json(result);
  }),
);

export default router;
