# Prompt 01: Database & Backend Core

```
I'm building Unloch, a between-session AI companion platform for therapists and patients. The project scaffold is already created at ~/unloch.

## What to do:

1. cd ~/unloch/backend
2. Run `npm install`
3. The Prisma schema is already at prisma/schema.prisma — run `npx prisma migrate dev --name init` to create the database (make sure Docker postgres is running first via `docker-compose up postgres -d`)
4. Build the Express server in src/index.ts (skeleton exists) with:
   - All middleware (helmet, cors, morgan, rate limiting)
   - Error handling middleware with proper error classes
   - Request validation using Zod schemas
5. Build the auth service in src/services/auth/:
   - POST /api/v1/auth/register (therapist registration with email + password)
   - POST /api/v1/auth/login (returns JWT access + refresh tokens)
   - POST /api/v1/auth/refresh (refresh token rotation)
   - POST /api/v1/auth/mfa/setup (generate TOTP secret)
   - POST /api/v1/auth/mfa/verify (verify TOTP code)
   - Middleware: authenticateToken, requireRole('therapist'), requireMFA
   - Password: bcrypt with 12 rounds
   - JWT: access token 15min, refresh token 7 days, stored in Redis
6. Build patient auth (simplified for MVP):
   - POST /api/v1/auth/patient/login (magic link via email)
   - GET /api/v1/auth/patient/verify/:token (verify magic link)
7. Build the audit logger utility in src/utils/audit.ts:
   - logAudit(actorId, actorType, action, entityType, entityId, metadata, ipAddress)
   - Writes to audit_log table — append only, never update or delete
   - Every auth action gets logged

IMPORTANT CONSTRAINTS:
- Every route must validate input with Zod
- Every route must call the audit logger
- Never expose password hashes or internal IDs in responses
- Rate limit: 5 login attempts per 15 minutes per IP
- All error responses use consistent format: { error: string, code: string }
```
