# ─────────────────────────────────────────────────────────────────────────────
# StockStory India — Dockerfile
# Multi-stage build: build the Vite SPA, then serve it with a lightweight
# Node server that also runs the Fastify API on the same container.
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: build ───────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS builder
WORKDIR /app

# Install dependencies (leverages Docker layer cache)
COPY package.json package-lock.json ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build
RUN npm run compile:backend

# ── Stage 2: production runtime ───────────────────────────────────────────────
FROM node:22-bookworm-slim AS runner
WORKDIR /app
RUN mkdir -p data

# Install Python 3 for public NSE data providers
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-pip python3-venv && \
    rm -rf /var/lib/apt/lists/* && \
    python3 --version

ENV NODE_ENV=production

# Install all dependencies (tsx needed for runtime path alias resolution)
COPY package.json package-lock.json ./
RUN npm install

# Remove dev dependencies except tsx (needed for runtime)
RUN npm prune --omit=dev || true && \
    npm install --no-save tsx 2>/dev/null || true

# Ensure tsx is available
RUN npx tsx --version

# Create Python venv and install dependencies
# Using venv avoids PEP 668 --break-system-packages requirement
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
COPY requirements-nse.txt ./
RUN pip install --no-cache-dir -r requirements-nse.txt

# Copy probe scripts for runtime diagnostics
COPY scripts/check-python-runtime.ts ./scripts/check-python-runtime.ts
COPY scripts/probe-jugaad-data-provider.py ./scripts/probe-jugaad-data-provider.py
COPY scripts/probe-nsepython-provider.py ./scripts/probe-nsepython-provider.py

# Copy source code (for tsx runtime resolution of @/ path aliases)
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig*.json ./
COPY --from=builder /app/package.json ./

# Copy compiled frontend assets and backend JS
COPY --from=builder /app/dist ./dist

# Copy database migrations (may be needed at runtime)
COPY --from=builder /app/src/db/migrations ./src/db/migrations

# ── Expose ────────────────────────────────────────────────────────────────────
# 4001 = Fastify API
EXPOSE 4001

# ── Start ─────────────────────────────────────────────────────────────────────
# Use tsx to resolve @/ path aliases correctly
CMD ["npx", "tsx", "src/backend/startServer.ts"]
