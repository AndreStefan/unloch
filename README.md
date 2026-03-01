# Unloch.me

**AI-Powered Therapist Companion Platform**

Between-session AI companion that operates under a licensed therapist's clinical direction.

## Architecture

```
unloch/
├── backend/          # Node.js + Express API (TypeScript)
├── ai-service/       # Python FastAPI — LLM orchestration
├── dashboard/        # React — Therapist Dashboard
├── patient-app/      # React — Patient PWA
├── shared/           # Shared types and constants
├── infra/            # Terraform, Docker, scripts
└── docs/             # Documentation + Claude Code prompts
```

## Quick Start

```bash
# 1. Install dependencies
cd backend && npm install
cd ../dashboard && npm install
cd ../patient-app && npm install
cd ../ai-service && pip install -r requirements.txt

# 2. Set up database
cp backend/.env.example backend/.env
# Edit .env with your database credentials
cd backend && npx prisma migrate dev

# 3. Start all services
docker-compose up
```

## Claude Code Build Sequence

See `docs/claude-code-prompts/` for step-by-step build prompts.
Execute in order: 01 → 02 → 03 → ... → 10

## Key Principles

1. **The AI is a messenger, not a therapist.** Every output traces to a clinician decision.
2. **Crisis detection runs first.** Before any rule matching, on every message.
3. **Audit everything.** Immutable logs. No deletions.
4. **Patient initiates.** AI never proactively contacts unless opted in.
5. **HIPAA from day one.** Encryption, BAAs, access controls — not bolted on later.
