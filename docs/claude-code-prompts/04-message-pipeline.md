# Prompt 04: Message Pipeline

```
Continue building Unloch. Auth, crisis detection, and rule engine are working.

## What to build:

The full message processing pipeline — patient sends message → crisis check → rule match → response delivery.

1. In backend/src/services/messages/pipeline.ts:
   - processMessage(patientId, content, socketId):
     Step 1: Save inbound message to DB
     Step 2: Crisis detection middleware (already built) — if crisis, stop here
     Step 3: Call ruleEngine.matchRules(patientId, content)
     Step 4a: If rule matched → save outbound message (type: 'rule_response', include matchedRuleId + confidence)
     Step 4b: If NO match → save outbound message with default response: "I hear you. Let's make sure [therapist_name] sees this before your next session."
     Step 5: If matched rule has escalationLevel 'alert' or 'urgent' → create alert for therapist
     Step 6: Emit response via WebSocket to patient
     Step 7: Audit log the entire interaction

2. In backend/src/routes/messages.ts:
   - POST /api/v1/messages — patient sends message (requires patient auth)
     Body: { content: string }
     Response: { message: Message, response: Message }
   - GET /api/v1/messages/:patientId — conversation history
     Query params: ?limit=50&before=<cursor>
     Auth: patient can only see own; therapist can see their patients'

3. WebSocket integration in src/index.ts:
   - Channel: /chat/:patientId
   - Events:
     - client → 'message' { content: string }
     - server → 'response' { message: Message }
     - server → 'crisis' { crisisEvent: CrisisEvent }
     - server → 'typing' { status: 'processing' | 'idle' }
   - Auth: verify JWT on connection, validate patient-therapist relationship

4. In backend/src/services/alerts/index.ts:
   - createAlert(therapistId, patientId, ruleId, messageId, level)
   - getAlerts(therapistId, { status, limit, offset })
   - resolveAlert(alertId, therapistId)
   - GET /api/v1/alerts (therapist only)
   - PUT /api/v1/alerts/:id/resolve (therapist only)
```
