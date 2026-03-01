# Build-only Dockerfile for CI — produces static dist/ artifacts (PWA)
FROM node:20-alpine AS builder
WORKDIR /app

COPY patient-app/package.json patient-app/package-lock.json ./
RUN npm ci

COPY patient-app/ ./

ARG VITE_API_URL=https://api.unloch.me
ARG VITE_WS_URL=wss://api.unloch.me
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_WS_URL=${VITE_WS_URL}

RUN npm run build

# Extract artifacts (use: docker build --output type=local,dest=./out ...)
FROM scratch AS artifacts
COPY --from=builder /app/dist /dist
