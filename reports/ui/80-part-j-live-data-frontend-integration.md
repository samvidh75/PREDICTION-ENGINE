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

Pending initial verification gate:

- `npm run typecheck:all`
- `npm run lint`
- `npm run test:unit`
- `npm run validate:hygiene`
- `npm run build:frontend`
- `npm run build:backend`

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

- Extend `src/lib/product/productViewAdapters.ts` where needed.
- Use product view models for leaderboard/scanner rows, company research cards, alert copy, and invest handoff context.
- Ensure adapters remove provider/internal fields and normalize `undefined`, `null`, `NaN`, and object dumps.

## Product Rules

- No backend plumbing in user-facing UI.
- No fake data, fake rankings, fake signals, fake broker connection, fake alerts, fake P&L, or fake social proof.
- No Buy/Hold/Sell recommendation language.
- “Invest” means review-first broker handoff only.

## Acceptance Criteria

- Full verification gate passes or any remaining known non-critical external issue is documented.
- User-facing routes contain no provider/backend/debug vocabulary.
- Frontend surfaces show real loaded data cleanly and omit or soften missing sections.
- Screenshots are captured to `.tmp/part-j-live-data-frontend-integration-after/` and not committed.
- No secrets committed or printed.
- No branch or PR created.
