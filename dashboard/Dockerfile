# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# Stage 2: Serve with lightweight Node server
FROM node:20-alpine
RUN npm install -g serve
COPY --from=builder /app/dist /app/dist
ENV PORT=3000
EXPOSE 3000
CMD ["serve", "-s", "/app/dist", "-l", "3000"]
