# Prompt 05: Therapist Dashboard

```
Continue building Unloch. The full backend is working.

## What to build:

React web app for therapists. This is the primary interface where clinicians manage rules, monitor patients, and review alerts.

1. cd ~/unloch/dashboard
2. Initialize with: npx create-vite . --template react-ts
3. Install: npm install react-router-dom @tanstack/react-query axios socket.io-client recharts date-fns lucide-react
4. Install Tailwind CSS

## Design direction:
- Warm, professional, NOT clinical. Think: premium SaaS for healthcare professionals.
- Color palette: deep navy (#1B2A4A), warm teal (#0D7377), soft cream (#FFF8F0), warm gray (#F5F3F0)
- Typography: clean sans-serif, generous spacing
- Layout: sidebar nav + main content area

## Pages to build:

### Dashboard Home (/dashboard)
- Alert feed (sorted by severity: crisis red, alert amber, info gray)
- Today's sessions panel with pre-session briefing links
- Patient engagement stats (interactions this week, mood trends)
- Quick action buttons: "Add Rule", "View All Patients"

### Patient List (/patients)
- Table: name, last interaction, mood trend (sparkline), active rules count, next session, status badge
- Search + filter (by status, by date range)
- Click → Patient Detail

### Patient Detail (/patients/:id)
- Tabs: Overview | Conversation | Rules | Mood | Assignments
- Overview: summary stats, mood chart (recharts), recent alerts
- Conversation: full message history with rule attributions visible
- Rules: rules active for this patient with edit/toggle/test
- Mood: 30/60/90 day chart
- Assignments: homework list with completion status

### Rule Builder (/rules/new and /rules/:id/edit)
- Form with fields from the spec:
  - Rule name (text input)
  - Patient selector (dropdown, "All patients" option)
  - Trigger keywords (tag input — type keyword, press enter to add)
  - Response content (rich text editor / textarea with preview)
  - Attribution label (text input, default "Your therapist's guidance:")
  - Escalation level (radio: informational / alert / urgent)
  - Expiration date (optional date picker)
- Test panel: type a sample patient message → see if rule would match
- Save → version created, audit logged

### Rule Library (/rules)
- All rules for this therapist
- Filter by: patient, escalation level, active/inactive
- Bulk actions: activate/deactivate selected

### Settings (/settings)
- Profile (name, license info)
- MFA setup
- Notification preferences (crisis: always, alert: business hours, info: digest)
- Default attribution label
- Practice management (if admin)

## Components to build:
- Layout/Sidebar with nav links and therapist name
- AlertCard (severity color coding, patient name, preview, action buttons)
- RuleCard (name, patient, trigger preview, status toggle)
- MoodChart (recharts line chart, 7/30/60/90 day options)
- PatientRow (table row with sparkline, status badge)
- MessageBubble (different styles per message type)
- CrisisBanner (full-width alert for active crisis events)

## API integration:
- Use @tanstack/react-query for all data fetching
- API client in src/services/api.ts with auth token interceptor
- WebSocket connection for real-time alerts
```
