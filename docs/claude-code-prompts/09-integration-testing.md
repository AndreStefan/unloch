# Prompt 09: Integration Testing

```
Continue building Unloch.

## What to build:

End-to-end tests for the critical flows. These are the tests that MUST pass before any deploy.

1. In backend/tests/integration/:

   test-crisis-detection.test.ts:
   - Send message with HIGH crisis keyword → verify crisis event created, therapist notified, crisis response returned
   - Send message with MODERATE keyword → verify AI service called, appropriate response
   - Send safe message → verify no crisis triggered
   - Verify crisis cannot be cleared by patient (only therapist)
   - Verify crisis detection cannot be bypassed or disabled

   test-rule-engine.test.ts:
   - Create rule with keyword trigger → send matching message → verify correct response delivered
   - Send non-matching message → verify default response
   - Deactivate rule → send matching message → verify no match
   - Multiple rules match → verify priority ordering works
   - Rate limiting → send 4 messages in 10 minutes → verify 4th gets default response
   - Expired rule → verify not matched

   test-message-pipeline.test.ts:
   - Full flow: patient sends message → crisis check → rule match → response saved → WebSocket emitted
   - Verify audit log entries for each step
   - Verify message attribution includes therapist label
   - Verify patient can only see their own messages
   - Verify therapist can only see their patients' messages

   test-auth.test.ts:
   - Register → login → get JWT → access protected route
   - Invalid password → locked after 5 attempts
   - Expired token → refresh → new token
   - Patient magic link flow
   - MFA setup and verification

2. Run with: npm test
3. Coverage target: >80% on services/, 100% on crisis detection
```
