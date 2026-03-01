# Prompt 03: Rule Engine

```
Continue building Unloch. Auth and crisis detection are working.

## What to build:

The rule engine — the core product. Therapists author rules, the engine matches patient messages against them and delivers pre-authored responses.

1. In backend/src/services/rules/index.ts:
   - CRUD operations:
     - createRule(therapistId, data) — creates rule + first RuleVersion
     - updateRule(ruleId, therapistId, data) — creates new RuleVersion, increments version
     - deactivateRule(ruleId, therapistId) — soft delete (active=false), audit logged
     - getRulesForPatient(patientId, therapistId) — all active rules
     - getRulesForTherapist(therapistId) — all rules across patients
   - Rule matching (MVP — keyword only):
     - matchRules(patientId, messageContent):
       - Get all active rules for this patient
       - For each rule, check triggerConfig.keywords against message
       - Case-insensitive substring matching
       - Return matched rules sorted by priority (urgent > alert > informational)
       - If multiple matches at same level, return most recently updated
       - Rate limit: max 3 rule responses per 10-minute window per patient

2. In backend/src/routes/rules.ts:
   - GET /api/v1/rules — list rules for authenticated therapist
   - GET /api/v1/rules/:id — get rule detail with version history
   - POST /api/v1/rules — create new rule
   - PUT /api/v1/rules/:id — update rule (creates new version)
   - DELETE /api/v1/rules/:id — deactivate rule
   - POST /api/v1/rules/:id/test — simulate: { testMessage: string } → returns what would match

3. Zod validation schemas for rule creation/update:
   - name: string, 1-200 chars
   - triggerConfig: { keywords: string[], patterns?: string[] }
   - responseContent: string, 1-2000 chars
   - attribution: string, default "Your therapist's guidance:"
   - escalationLevel: enum
   - patientId: optional uuid (null = applies to all patients of this therapist)
   - expiresAt: optional datetime

4. Every rule CRUD action audit logged with full before/after state.
```
