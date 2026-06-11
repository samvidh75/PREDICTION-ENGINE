# Prompt 4 Browser Gate Report

## Implemented

- Installed `@playwright/test`.
- Added `playwright.config.ts` with a Vite-backed Chromium browser journey target.
- Added `tests/e2e/browser/public-journeys.spec.ts`.
- Added `test:e2e:browser` and `test:e2e:browser:install` scripts.
- Added a CI `browser-journeys` job in `.github/workflows/ci.yml`.

## Journeys

- Trust Centre unavailable metrics journey verifies the UI does not render old static performance numbers or unsupported evidence claims when trust metrics fail.
- Public rankings journey verifies a real browser can open and render a public app route.

## Evidence

- `npm run test:e2e:browser -- --list` listed both browser journeys successfully.
