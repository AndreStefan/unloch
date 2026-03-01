# Build-only Dockerfile for CI — produces static dist/ artifacts
FROM node:20-alpine AS builder
WORKDIR /app

COPY dashboard/package.json dashboard/package-lock.json ./
RUN npm ci

COPY dashboard/ ./

ARG VITE_API_URL=https://api.unloch.me
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build

# Extract artifacts (use: docker build --output type=local,dest=./out ...)
FROM scratch AS artifacts
COPY --from=builder /app/dist /dist
