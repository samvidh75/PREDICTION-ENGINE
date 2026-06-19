# Part J — Live Data Frontend Integration

## Baseline

- Current HEAD at start: `e4603744b Refine premium StockStory interface experience`.
- Provider/config baseline referenced by brief: `16693c6a`, `05229752`, `13631bdf`.
- `git pull --ff-only origin main`: already up to date after sandbox escalation for `.git/FETCH_HEAD`.

## Working Tree Classification

- `:memory:` — local generated artifact; do not stage.
- `reports/ui/responsive-audit/*.png` — generated screenshot/audit artifacts; do not stage.
- Untracked files at baseline: none.
- Unsafe secret/config files staged: none.

## Verification Baseline

- `npm run typecheck:all` — PASS.
- `npm run lint` — PASS.
- `npm run validate:hygiene` — PASS after sandbox escalation for `tsx` IPC.
- `npm run build:frontend` — PASS.
- `npm run build:backend` — PASS.
- `npm run test:unit` — PASS after rerunning with sandbox escalation for local test server binding.
- Focused frontend/product tests — PASS: `src/pages/__tests__/RealDataIntegration.test.tsx`, `src/pages/__tests__/ComparePage.test.tsx`, `src/pages/__tests__/PortfolioPage.test.tsx`, `src/components/invest/__tests__/InvestHandoffSheet.test.tsx`, `src/lib/product/productViewAdapters.test.ts`.

## Frontend Integration Plan

- Keep backend/provider behavior untouched.
- Route all live backend responses through frontend product-facing adapters.
- Hide provider/API/source/internal vocabulary from normal user surfaces.
- Preserve real numeric values where available; never fabricate missing values.
- Convert missing data into product states such as “Research signals pending” and “Track this company to review changes over time”.

## Routes To Audit

- Dashboard
- Scanner / Rankings
- Company detail
- Compare
- Watchlist
- Portfolio
- Alerts
- Invest handoff
- Methodology / command palette smoke paths

## Adapter Plan

- Existing `src/lib/product/productViewAdapters.ts` already contained product-facing adapters for leaderboard rows, signals, scanner rows, alert changes, and company thesis status.
- This pass preserved the backend contract and tightened consuming surfaces rather than creating another adapter layer.
- Added tests to ensure product surfaces do not expose provider/backend/API vocabulary, raw render garbage, or trading-style copy.

## Product Rules

- No backend plumbing in user-facing UI.
- No fake data, fake rankings, fake signals, fake broker connection, fake alerts, fake P&L, or fake social proof.
- No Buy/Hold/Sell recommendation language.
- “Invest” means review-first broker handoff only.

## Frontend Changes

### Public Rankings

- Replaced raw API/HTTP failure text with product-safe copy: “Rankings are being prepared for the latest cycle.”
- Renamed the visible table column from “Freshness” to “Updated”.
- Added a regression test that simulates HTTP 502 and asserts the public page does not render `HTTP`, `502`, `API`, `backend`, or provider vocabulary.

### Compare

- Corrected the risk cue logic and copy. The lowest risk factor now renders as “Lower risk score” instead of the misleading “Higher risk”.
- Replaced “Stronger research case” with “Highest research score” to avoid recommendation-like framing.
- Renamed “Decision Helper” to “Research cues”.
- Changed loading and empty-state copy to product-facing research language.
- Added tests for lower-risk cue mapping and no product-forbidden copy in the compare empty state.

### Portfolio

- Removed the disabled “Invest with broker” action from the portfolio header.
- Reworded the header to describe local thesis monitoring and keep execution outside StockStory.
- Replaced “with live quotes” with “with current pricing”.
- Added a portfolio render test that mocks a real local holding plus quote and checks pricing language and forbidden-copy compliance.

### Scanner

- Changed the disabled card action from “Invest” / “Broker handoff being prepared” to “Handoff” / “External handoff is being prepared”.
- The scanner still keeps the research, compare, and track actions as the primary paths.

### Invest Handoff

- Rebuilt copy from order/broker framing into review-first handoff framing.
- Removed visible “Buy”, “Order preview”, “Final order”, “broker selection”, and “trade” wording.
- Kept clear disclaimers that StockStory is a research workspace and does not execute or send external instructions.
- Expanded tests to include product-forbidden-term checks.

## Screenshot Proof

- After screenshots copied to `.tmp/part-j-live-data-frontend-integration-after/`.
- Captured/inspected responsive proof for landing, rankings, trust, dashboard, watchlist, and portfolio at desktop/mobile sizes.
- Visual inspection caught the public rankings raw HTTP message; it was fixed and screenshots were regenerated.
- Screenshot artifacts were not staged.

## Verification Results

- `npm run typecheck:all` — PASS.
- `npm run lint` — PASS.
- `npm run validate:hygiene` — PASS, 0 secrets and 0 hazards.
- `npm run build:frontend` — PASS.
- `npm run build:backend` — PASS.
- `npm run test:unit` — PASS, 114 files / 1152 tests.
- Focused frontend tests — PASS, 5 files / 34 tests.
- `npm run test:e2e` — PASS, 36 Playwright tests.
- `npm run audit:visual-layout` — PASS across public and authenticated routes/viewports.
- `npm run audit:responsive-ui` — PASS and regenerated screenshot proof.
- `npm run smoke:production` — PASS.
- `npm run verify:data:production` — PASS with 4 non-critical warnings reported by the script: bhavcopy delivery coverage, index/sector coverage, partial automatic fundamentals, and manual CSV fallback readiness.

## True Blockers

- No remaining verification blocker for this Part J frontend surface pass.
- A separate local commit already exists on `main` ahead of `origin/main`: `ecd6ea676 Wire research engine into product API routes (Part L)`. It includes backend/API route work outside the Part J frontend scope. This report commit only documents the frontend hardening and does not add new provider behavior.

## Safety Confirmation

- No fake data, fake rankings, fake signals, fake broker connection, fake alerts, fake source labels, or fake provider health were added.
- No provider keys or secrets were added to tracked files.
- `.env`, `.tmp`, screenshots, `:memory:`, and generated responsive-audit PNGs are not intended for staging in this report commit.

## Acceptance Criteria

- Full verification gate passes or any remaining known non-critical external issue is documented.
- User-facing routes contain no provider/backend/debug vocabulary.
- Frontend surfaces show real loaded data cleanly and omit or soften missing sections.
- Screenshots are captured to `.tmp/part-j-live-data-frontend-integration-after/` and not committed.
- No secrets committed or printed.
- No branch or PR created.
