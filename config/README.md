# Configuration

## Structure

```
config/
  README.md              # This file
  environments/
    .env.example         # Master env template (all vars + docs)
    .env.production.example  # Production-specific overrides
    schema.env.example   # Minimal schema reference
  tsconfig/
    (reference — root tsconfig*.json files are the active configs)
```

## Environments

| File | Purpose | Scope |
|------|---------|-------|
| `.env.example` (root + `config/environments/`) | Complete env variable inventory | All environments |
| `.env.production.example` | Production-specific (YFINANCE, Render) | Render backend |
| `config/environments/schema.env.example` | Minimal schema (5 lines) | Reference only |

### Rules
- Never commit live secrets to `.env` files
- Keep `config/environments/.env.example` in sync with Render and Vercel
- Root `.env.example` is the developer copy target; `config/environments/` is the canonical source

## tsconfig Hierarchy

```
tsconfig.json              ← Base: Vite frontend (src/), strict, noEmit
  tsconfig.frontend.json   ← Frontend: extends tsconfig.json, explicit src/ includes
tsconfig.backend.json      ← Backend: Fastify/Express in src/backend/
  tsconfig.backend.emit.json  ← Emit: compiles backend to dist/
  tsconfig.providers.json     ← Providers: data provider type-checking
tsconfig.ingestion.json    ← Standalone: scripts/ingest-*.ts
tsconfig.all.json          ← Universal: all src/ + scripts/ (noEmit)
```

### Package Script Mapping
- `typecheck:frontend` → `tsconfig.frontend.json`
- `typecheck:backend` → `tsconfig.backend.json`
- `typecheck:providers` → `tsconfig.providers.json`
- `typecheck:ingestion` → `tsconfig.ingestion.json`
- `typecheck:all` / `typecheck:repo` → `tsconfig.all.json`
- `compile:backend` → `tsconfig.backend.emit.json`
- `build:frontend` → `typecheck:frontend` then `vite build`

## Feature Flags

See `config/feature-flags.ts` for the complete manifest of all feature flags,
their default values, safe deployment paths, and lifecycle status.
