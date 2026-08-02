# TypeScript Configuration Guide

## File Hierarchy

```
tsconfig.base.json     ← Shared settings (target, module, strict mode, etc.)
  tsconfig.json        ← Frontend (Vite) — extends base
  tsconfig.backend.json ← Backend (Fastify/Express) — extends base
```

### tsconfig.base.json
**Purpose:** Single source of truth for shared compiler options.

Contains settings common to all TS projects in the monorepo:
- `target: ES2022`, `module: ESNext`, `moduleResolution: Bundler`
- `strict: true` with `noImplicitAny: false` (pragmatic strictness)
- `resolveJsonModule`, `esModuleInterop`, `allowJs` for maximum compatibility

**Does NOT set:** `noEmit`, `outDir`, `rootDir`, `lib`, `jsx`, `types` — these are the responsibility of each derived config.

### tsconfig.json (frontend / Vite)
**Purpose:** Type-check the frontend React app and UI components.

- **Extends:** `tsconfig.base.json`
- **Used by:** `vite build` (Vite reads this at root), `npm run typecheck:frontend`
- **Key settings:** `jsx: react-jsx`, `noEmit: true`, `lib: [ES2022, DOM, DOM.Iterable]`
- **Types:** `vite/client`, `vitest/globals`
- **Include:** All frontend source files under `src/` (pages, components, hooks, lib, design-system, etc.)
- **Exclude:** All backend paths (`src/backend/**`, `src/db/**`), test files, scripts, intelligence

### tsconfig.backend.json
**Purpose:** Type-check and compile the backend server code.

- **Extends:** `tsconfig.base.json`
- **Used by:** `npm run typecheck:backend` (type-checking), `npm run compile:backend` (emits to `dist/`)
- **Key settings:** `outDir: dist`, `rootDir: src`, `sourceMap: true`
- **Types:** `vite/client`, `node`
- **Include:** `src/backend/`, `src/db/`, selected `src/intelligence/` and `src/services/` files
- **Exclude:** test files

#### Type-checking vs Building
```
npm run typecheck:backend   # tsc --noEmit -p tsconfig.backend.json  (no output)
npm run compile:backend     # tsc -p tsconfig.backend.json          (emits to dist/)
```
The same config handles both modes — the `--noEmit` CLI flag controls emitting.

## Deleted Configs

These configs were removed during consolidation (June 2026):

| Deleted File | Replaced By | Reason |
|---|---|---|
| `tsconfig.frontend.json` | `tsconfig.json` | Merged into root config; extended `tsconfig.json` with only include/exclude overrides |
| `tsconfig.all.json` | `tsconfig.json` + `tsconfig.backend.json` | Universal type-checking was redundant with per-target checks |
| `tsconfig.backend.emit.json` | `tsconfig.backend.json` | Emit is now controlled via CLI `--noEmit` flag |
| `tsconfig.ingestion.json` | `tsconfig.backend.json` | Ingestion scripts covered by backend config |
| `tsconfig.providers.json` | `tsconfig.backend.json` | Provider files covered by backend config |

## How to Add a New Config

If you need a dedicated tsconfig for a new target (e.g., a worker or CLI tool):

1. Create a new file extending `tsconfig.base.json`:
   ```json
   {
     "extends": "./tsconfig.base.json",
     "compilerOptions": {
       "outDir": "dist/worker",
       "types": ["node"]
     },
     "include": ["src/worker/**/*"]
   }
   ```
2. Add a script in `package.json`:
   ```json
   "typecheck:worker": "tsc -p tsconfig.worker.json --noEmit",
   "compile:worker": "tsc -p tsconfig.worker.json"
   ```
3. Document the new config in this file.

## Build Script Summary

| Command | Config Used | Emits? |
|---|---|---|
| `npm run typecheck:frontend` | `tsconfig.json` (default) | No (`--noEmit`) |
| `npm run typecheck:backend` | `tsconfig.backend.json` | No (`--noEmit`) |
| `npm run typecheck:active` | Both above | No |
| `npm run compile:backend` | `tsconfig.backend.json` | Yes → `dist/` |
| `npm run build:frontend` | `tsconfig.json` (via `typecheck:frontend`) | Yes → Vite `dist/` |
| `npm run build` | `tsconfig.json` (via `build:frontend`) | Yes |
