# ─────────────────────────────────────────────────────────────────────────────
# StockStory India — Dockerfile
# Multi-stage build: build the Vite SPA, then serve it with a lightweight
# Node server that also runs the Fastify API on the same container.
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies (leverages Docker layer cache)
COPY package.json package-lock.json ./
RUN apk add --no-cache python3 make g++ && npm ci --frozen-lockfile

# Copy source and build
COPY . .
RUN npm run build
RUN npm run compile:backend

# ── Stage 2: production runtime ───────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
RUN mkdir -p data

ENV NODE_ENV=production

# Only install production dependencies
COPY package.json package-lock.json ./
RUN apk add --no-cache python3 make g++ && npm ci --frozen-lockfile --omit=dev && apk del python3 make g++

# Copy compiled frontend assets
COPY --from=builder /app/dist ./dist

# Copy compiled backend JavaScript
COPY --from=builder /app/dist/backend ./dist/backend

# Copy database migrations (may be needed at runtime)
COPY --from=builder /app/src/db/migrations ./src/db/migrations

# Copy database files (needed for SQLite retention services)
COPY --from=builder /app/data ./data

# ── Expose ────────────────────────────────────────────────────────────────────
# 4001 = Fastify API
EXPOSE 4001

# ── Start ─────────────────────────────────────────────────────────────────────
CMD ["node", "dist/backend/backend/startServer.js"]
