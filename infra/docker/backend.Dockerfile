# ── Stage 1: Install dependencies ──
FROM node:20-alpine AS deps
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --production=false

# ── Stage 2: Build ──
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY backend/ ./
RUN npx prisma generate
RUN npm run build
RUN npm prune --production

# ── Stage 3: Production runtime ──
FROM node:20-alpine AS runner
RUN apk add --no-cache dumb-init

# Non-root user (HIPAA / security best practice)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S unloch -u 1001 -G nodejs

WORKDIR /app

# Copy only what's needed for runtime
COPY --from=builder --chown=unloch:nodejs /app/dist ./dist
COPY --from=builder --chown=unloch:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=unloch:nodejs /app/package.json ./
COPY --from=builder --chown=unloch:nodejs /app/prisma ./prisma
COPY --from=builder --chown=unloch:nodejs /app/node_modules/.prisma ./node_modules/.prisma

USER unloch
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
