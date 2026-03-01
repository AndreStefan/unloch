# Prompt 06: Patient Chat Interface

```
Continue building Unloch. Backend and therapist dashboard are working.

## What to build:

Patient-facing Progressive Web App (PWA). This is where patients interact with their therapist's AI between sessions.

1. cd ~/unloch/patient-app
2. Initialize with: npx create-vite . --template react-ts
3. Install same deps as dashboard + add PWA support via vite-plugin-pwa

## Design direction:
- WARM. Not clinical. Not robotic. Feels like texting your therapist's office.
- Soft color palette: warm off-white (#FFF8F0), sage green (#7CAB8A), gentle navy (#2C3E5A)
- NO gamification, no streaks, no badges. This is mental health, not Duolingo.
- Therapist's name visible at all times in the header
- Large, comfortable touch targets (this will be used on phones)
- Minimal UI — the chat is the product

## Pages:

### Chat (/chat) — PRIMARY INTERFACE
- Message bubbles:
  - Patient messages: right-aligned, warm color
  - Rule responses: left-aligned, includes attribution label ("Your therapist's guidance:"), subtle therapist-branded styling
  - System messages: center, gray, no bubble (reminders, scheduling)
  - Scope boundary: left-aligned, friendly tone, includes "Schedule session" CTA
  - Crisis: FULL SCREEN TAKEOVER — red banner, 988 link, crisis resources, "Your therapist is being notified"
- Text input at bottom with send button
- Typing indicator shows "reviewing your care plan..." (not "typing...")
- Pull-to-load older messages
- WebSocket connection for real-time

### Mood Logger (/mood)
- Big friendly emoji scale (1-10) — tap to select
- Optional note textarea ("What's contributing to this feeling?")
- 7-day trend visible as simple line chart
- Submit → saved, visible to therapist in briefing

### Homework & Medications (/homework)
- Assigned tasks from therapist with due dates
- Simple checkbox completion
- Medication reminders with acknowledge/skip

### My Data (/transparency)
- "What your therapist sees" — clear list of data types shared
- "Active support topics" — simplified view of active rule categories (NOT the trigger keywords)
- "Your rights" — pause/disconnect options, data export request

### Settings (/settings)
- Notification preferences
- Scheduled check-in opt-in (daily mood reminder)
- Pause Unloch (temporary, no data deleted)
- Crisis contact info

## Crisis Mode:
When crisis is detected, the ENTIRE app switches to crisis mode:
- Full screen red/warm banner
- Large, prominent 988 Suicide & Crisis Lifeline button
- Crisis Text Line: "Text HOME to 741741"
- "Your therapist is being notified right now."
- Cannot be easily dismissed (require deliberate "I'm okay" action)
- Returns to normal chat only when therapist clears crisis status OR patient explicitly confirms safety

## PWA config:
- Manifest with Unloch branding
- Service worker for offline: show cached messages + "reconnecting..." banner
- Push notification support for medication reminders and therapist messages
```
