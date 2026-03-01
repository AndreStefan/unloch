# Prompt 08: Audit & Compliance

```
Continue building Unloch.

## What to build:

Comprehensive audit logging and compliance features.

1. Ensure audit_log table has NO update or delete permissions at the DB level:
   - Create a Prisma migration that adds a PostgreSQL policy:
     REVOKE UPDATE, DELETE ON audit_log FROM unloch;
   - Only INSERT and SELECT allowed

2. In backend/src/services/audit/index.ts:
   - Enhance the audit logger to capture ALL actions:
     - auth.login, auth.logout, auth.mfa.verify
     - rule.create, rule.update, rule.deactivate, rule.test
     - message.send, message.receive
     - crisis.detect, crisis.clear
     - briefing.generate, briefing.view
     - patient.consent, patient.revoke, patient.pause
     - alert.create, alert.resolve
   - Each entry includes: actor, action, entity, metadata (before/after for mutations), IP address

3. In backend/src/routes/audit.ts:
   - GET /api/v1/audit/:patientId — full audit trail for a patient (therapist only)
   - GET /api/v1/audit/export/:patientId — download as CSV/JSON
   - GET /api/v1/audit/practice — practice-level audit log (admin only)

4. Data export for patient:
   - GET /api/v1/patients/:id/export — generates full data package:
     - All messages, mood logs, rules (anonymized), crisis events, assignments
     - Formatted as JSON + human-readable PDF
     - For patient data portability and records requests

5. In dashboard — add audit viewer:
   - Table view on patient detail page: sortable, filterable audit log
   - Export button: CSV download
   - On rule detail page: show full version history with diffs
```
