# Prompt 02: Crisis Detection Service

```
Continue building Unloch. The backend auth is working.

## What to build:

Build the crisis detection service — this is the MOST IMPORTANT safety feature. It runs on EVERY patient message BEFORE any other processing.

1. In backend/src/middleware/crisisDetection.ts:
   - Import crisis keywords from shared/constants/crisis-keywords.ts
   - Create Express middleware that intercepts every POST to /api/v1/messages
   - Layer 1: Keyword scan — check message against CRISIS_KEYWORDS_HIGH and CRISIS_KEYWORDS_MODERATE
   - If HIGH keyword match → immediate crisis (confidence 1.0)
   - If MODERATE keyword match → call AI service for Layer 2 classification
   - If no keyword match → pass through to rule engine

2. In ai-service/src/services/crisis.py:
   - POST /api/v1/crisis/detect endpoint
   - Takes: { message: string, context: string[] } (last 5 messages)
   - Uses Anthropic Claude with CRISIS_DETECTION_PROMPT from prompts/system_prompt.py
   - Returns: { is_crisis: bool, confidence: float, reasoning: string, detected_signals: string[] }
   - Temperature: 0.0 (deterministic)
   - Max tokens: 500

3. In backend/src/services/crisis/index.ts:
   - handleCrisisEvent(patientId, messageId, detectionLayer, confidence):
     - Create CrisisEvent record
     - Send push notification to therapist (mock for MVP — just log + create alert)
     - Return crisis response object for patient UI
   - clearCrisis(crisisEventId, therapistId):
     - Therapist manually clears crisis status
     - Re-enables rule engine for that patient
     - Audit logged

4. Add routes:
   - PUT /api/v1/crisis/:id/clear (therapist only, requires auth + MFA)
   - GET /api/v1/crisis/events/:patientId (therapist only — crisis history)

CRITICAL:
- Crisis detection CANNOT be bypassed or disabled
- Crisis events are NEVER deleted
- False positive bias: when in doubt, escalate
- Every crisis detection result is audit logged with full context
```
