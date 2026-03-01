# Unloch — Claude Code Build Sequence

Execute these prompts in order. Each builds on the previous.
Copy-paste each prompt into Claude Code in your terminal.

## Prerequisites
1. Node.js 20+ installed
2. Python 3.12+ installed
3. Docker Desktop running
4. Anthropic API key (for AI service)

## Sequence
| # | Prompt | What It Builds | Est. Time |
|---|--------|---------------|-----------|
| 01 | Database & Backend Core | Prisma migrations, Express server, auth routes | 30 min |
| 02 | Crisis Detection | Keyword scanner middleware, crisis service | 20 min |
| 03 | Rule Engine | Rule CRUD, matching pipeline, test endpoint | 30 min |
| 04 | Message Pipeline | Full message processing flow with WebSocket | 30 min |
| 05 | Therapist Dashboard | React app with rule builder, patient list, alerts | 45 min |
| 06 | Patient Chat Interface | PWA with chat UI, mood logger, crisis routing | 45 min |
| 07 | Pre-Session Briefings | Briefing generation service + therapist view | 20 min |
| 08 | Audit & Compliance | Immutable audit logging, data export | 20 min |
| 09 | Integration Testing | End-to-end tests for critical flows | 30 min |
| 10 | Deploy to AWS | Terraform, Docker builds, production config | 45 min |

Total estimated: ~5 hours of Claude Code execution
