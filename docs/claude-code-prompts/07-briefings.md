# Prompt 07: Pre-Session Briefings

```
Continue building Unloch.

## What to build:

Pre-session briefing generation — auto-generated summary delivered to therapist before each session.

1. In ai-service/src/services/briefing.py:
   - POST /api/v1/briefings/generate
   - Input: { patientId, therapistId, sinceDate }
   - Gathers: all messages, mood logs, triggered rules, crisis events, assignment completions since last session
   - Sends to Claude with BRIEFING_GENERATION_PROMPT
   - Returns structured briefing markdown
   - Saves to briefings table

2. In backend/src/services/briefings/index.ts:
   - generateBriefing(patientId, therapistId, sessionDate)
   - getBriefing(briefingId, therapistId)
   - getBriefingsForPatient(patientId, therapistId)
   - Cron job: generate briefings 30 minutes before scheduled sessions (for MVP, therapist manually triggers)

3. Add routes:
   - POST /api/v1/patients/:id/briefing/generate (therapist triggers manually)
   - GET /api/v1/patients/:id/briefing (get latest briefing)
   - GET /api/v1/patients/:id/briefings (get all briefings, paginated)

4. In dashboard — add briefing view:
   - Button on patient detail: "Generate Briefing"
   - Rendered markdown in a clean panel
   - Header: "AI-generated summary — review against raw interaction data before clinical use"
   - Link to raw conversation history for verification
```
