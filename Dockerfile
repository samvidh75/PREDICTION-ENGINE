# ─────────────────────────────────────────────────────────────────────────────
# StockStory India — Dockerfile
# Multi-stage build: build the Vite SPA, then serve it with a lightweight
# Node server that also runs the Fastify API on the same container.
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: build ───────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

# Install dependencies (leverages Docker layer cache)
COPY package.json package-lock.json ./
RUN npm ci --frozen-lockfile

# Copy source and build
COPY . .
RUN npm run build
RUN npm run compile:backend

# ── Stage 2: production runtime ───────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app
RUN mkdir -p data

# Install Python 3.11+ for public NSE data providers
# (nselib, nsepython, jugaad-data — no credentials needed)
RUN apk add --no-cache python3 py3-pip && \
    python3 --version

ENV NODE_ENV=production

# Only install production dependencies
COPY package.json package-lock.json ./
RUN npm ci --frozen-lockfile --omit=dev

# Install Python dependencies for public NSE data providers
# jugaad-data, nsepython, nselib — no credentials required
COPY requirements-nse.txt ./
RUN python3 -m pip install --break-system-packages --no-cache-dir -r requirements-nse.txt 2>&1; \
    echo "pip_exit=$?"

# Copy probe scripts for runtime diagnostics
COPY scripts/probe-nselib-provider.py ./scripts/probe-nselib-provider.py
COPY scripts/check-python-runtime.ts ./scripts/check-python-runtime.ts

# Copy compiled frontend assets
COPY --from=builder /app/dist ./dist

# Copy compiled backend JavaScript
COPY --from=builder /app/dist/backend ./dist/backend

# Copy database migrations (may be needed at runtime)
COPY --from=builder /app/src/db/migrations ./src/db/migrations

# ── Expose ────────────────────────────────────────────────────────────────────
# 4001 = Fastify API
EXPOSE 4001

# ── Start ─────────────────────────────────────────────────────────────────────
CMD ["node", "dist/backend/backend/startServer.js"]
