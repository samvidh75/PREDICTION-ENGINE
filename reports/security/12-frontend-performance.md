# Phase 19 — Frontend Performance Audit

## Current State

| Metric | Value | Notes |
|--------|-------|-------|
| Bundle size (dist) | 4.2 MB | Includes all built assets |
| Build tool | Vite | With React plugin, path aliases |
| CI/CD build | `npm run build:frontend` | Runs typecheck + vite build |
| Code splitting | Not verified | Need to inspect route-level splitting |
| Lazy loading | Not verified | Need to check component imports |
| Image optimization | Not verified | Need to check image loading patterns |

## Bundle Analysis

The 4.2 MB production bundle is moderate for a data-heavy stock research app. Key optimization opportunities:

### What's Good
- Vite's default code splitting separates vendor chunks from app code
- Path aliases (`@/`, `@/types/`, `@/engines/`, `@/providers/`, `@/services/`) enable clean imports
- TypeScript with strict typechecking catches bundle issues at build time

### Recommendations

1. **Add route-level code splitting** — Use `React.lazy()` for page components to reduce initial bundle
2. **Audit vendor bundle** — Check if all dependencies in `package.json` are actually used at runtime
3. **Add bundle analysis tool** — `vite-plugin-visualizer` to identify large dependencies
4. **Compression** — Enable gzip/brotli in Fastify for static assets (configure in startServer.ts)
5. **Preload critical CSS** — Inline above-the-fold styles
6. **Image optimization** — Use AVIF/WebP formats for stock charts and logos
7. **Cache static assets** — Set far-future `Cache-Control` headers for hashed assets
