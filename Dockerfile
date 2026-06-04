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
RUN npm ci --frozen-lockfile

# Copy source and build
COPY . .
RUN npm run build

# ── Stage 2: production runtime ───────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Only install production dependencies
COPY package.json package-lock.json ./
RUN npm ci --frozen-lockfile --omit=dev

# Copy compiled frontend assets
COPY --from=builder /app/dist ./dist

# Copy backend source (runs via tsx in prod; swap for tsc-compiled JS if needed)
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./

# ── Expose ────────────────────────────────────────────────────────────────────
# 4001 = Fastify API  (proxied by nginx/Caddy to /api)
# 80   = Served by a separate static host (see docker-compose.yml)
EXPOSE 4001

# ── Start ─────────────────────────────────────────────────────────────────────
CMD ["node", "--loader", "tsx/esm", "src/backend/startServer.ts"]
