# Beta Launch Checklist

This document details deployment checks, test account scenarios, manual test cases, risks, metrics, and post-beta progression items.

---

## SECTION 1 – DEPLOYMENT

### Vercel Deployment Checks
- [ ] Build configurations mapped to `vite build` outputting to the `dist` directory.
- [ ] Routing rewrites in `vercel.json` verified to map client-side routers onto `/index.html`.
- [ ] Production build environment matches Node.js version `20.x` or higher.

### Render Backend Checks
- [ ] Start command configured to `npm start` (utilizing `tsx src/backend/startServer.ts`).
- [ ] Healthcheck endpoint configured to `/api/health` and verifying Postgres connection status.
- [ ] Memory limit alerts configured on the dashboard to prevent resource leakage under stress.

### Environment Variables Matrix
Verify existence and scope of the following secrets:
- [ ] `DATABASE_URL`: Connection string to target Postgres cluster.
- [ ] `COOKIE_SECRET`: Cryptographic key for secure browser sessions.
- [ ] `NODE_ENV`: Should be set explicitly to `production`.
- [ ] `FIREBASE_API_KEY`: Client token for authentication services.

### Firebase Mappings
- [ ] Authentication providers mapped (Email/Password active, Google OAuth scopes whitelisted).
- [ ] Authorized domains list whitelists target production deployment URLs.
- [ ] Security rules configured in JSON definitions.

### Database Checks
- [ ] Run migrations script (`npm run migrate`) to establish all indices and constraints on the cluster.
- [ ] Confirm master symbols table contains the full universe of active NSE stocks.

---

## SECTION 2 – TEST ACCOUNTS

The following scenarios are mapped for manual audits and user testing:

### 1. Beginner Investor Scenario
* **Goal**: Validate simple educational workflows.
* **Flow**:
  - Sign up via email link.
  - Review Nifty/Sensex indices and Market Pulse Heatmap on the Dashboard.
  - Search for `INFY`.
  - Review Booklet summary panels ("What happened?", "Why it matters?") avoiding high-complexity overlays.
* **Watchlist**: Track 1-2 standard large-cap stocks.

### 2. Intermediate Investor Scenario
* **Goal**: Evaluate sector strength indicators and watchlist updates.
* **Flow**:
  - Log in.
  - Navigate to Discovery to check sector rotation patterns.
  - Check Watchlist changes for daily deltas.
  - Read active factor notifications.
* **Watchlist**: Track 5-10 stocks.

### 3. Power User Scenario
* **Goal**: Stress test multi-factor portfolio analysis and timeline trackers.
* **Flow**:
  - Authenticate.
  - Add 15+ symbols to watchlists.
  - Post complex portfolio allocations (e.g. 20% INFY, 30% RELIANCE, 50% HAL) and inspect factor weights (Quality, Risk, Value, Growth).
* **Watchlist**: Multiple customized groups.

---

## SECTION 3 – MANUAL TEST CASES (50 CASES)

| ID | Module | Title | Expected Result | Checked |
| :--- | :--- | :--- | :--- | :---: |
| 1 | Auth | Load Landing Page | Displays hero callouts and CTA. | [ ] |
| 2 | Auth | Click Signup CTA | Redirects to standalone SignupPage. | [ ] |
| 3 | Auth | Invalid Email Signup | Renders email format warning. | [ ] |
| 4 | Auth | Short Password Signup | Renders password complexity warning. | [ ] |
| 5 | Auth | Complete Valid Signup | Redirects onto the authenticated Dashboard. | [ ] |
| 6 | Auth | Click Sign In Link | Navigates cleanly to LoginPage. | [ ] |
| 7 | Auth | Login Invalid Credentials | Displays authentic authentication error. | [ ] |
| 8 | Auth | Login Valid Credentials | Restores session and displays Dashboard. | [ ] |
| 9 | Auth | Session Persistence | Hard refresh keeps user authenticated. | [ ] |
| 10 | Auth | Logout Flow | Clears storage, invalidates session, redirects to landing. | [ ] |
| 11 | Dashboard | Top Bar Greeting | Shows greeting based on user name/time. | [ ] |
| 12 | Dashboard | Global Search Type | Matched symbols list appears inside overlay. | [ ] |
| 13 | Dashboard | Global Search Click | Routes user to `/page=stock&id=SYMBOL`. | [ ] |
| 14 | Dashboard | Connection Indicator | Shows "Live Stream" on connection. | [ ] |
| 15 | Dashboard | Index Card Values | Updates values continuously from service. | [ ] |
| 16 | Dashboard | Metric Card India VIX | Displays live volatility metric. | [ ] |
| 17 | Dashboard | Metric Card Breadth | Displays current breadth percentage. | [ ] |
| 18 | Dashboard | FII Flows Sign | Renders green for positive, red for negative flows. | [ ] |
| 19 | Dashboard | Empty Watchlist State | Shows "NO WATCHED SYMBOLS" panel. | [ ] |
| 20 | Dashboard | Watchlist Movers List | Shows correct symbols with daily changes. | [ ] |
| 21 | Dashboard | Watchlist Score Changes | Displays factor score deltas. | [ ] |
| 22 | Dashboard | Empty Alerts State | Renders "No pending factor alerts". | [ ] |
| 23 | Dashboard | Click Alert Item | Marks alert as read, removes from Dashboard. | [ ] |
| 24 | Dashboard | Saved Research Activity | Shows list of recently visited booklet pages. | [ ] |
| 25 | Discovery | Load Page | Displays sector explorer maps and cards. | [ ] |
| 26 | Discovery | Click Sector Card | Filters explorer lists to matches. | [ ] |
| 27 | Discovery | Ticker Click | Navigates onto the stock page. | [ ] |
| 28 | Discovery | Empty Search filters | Renders graceful blank notifications. | [ ] |
| 29 | Company Booklet | Load Company Hero | Renders ticker, name, and current price. | [ ] |
| 30 | Company Booklet | Price Chart Render | Renders price line path on canvas. | [ ] |
| 31 | Company Booklet | Chart Zoom | Mouse wheel scale updates zoom viewport. | [ ] |
| 32 | Company Booklet | Chart Drag | Pointer drag pans time windows. | [ ] |
| 33 | Company Booklet | Chart Crosshair Move | Overlay canvas renders dashed indicators. | [ ] |
| 34 | Company Booklet | Executive Summary Blocks | Renders dynamic summaries from API. | [ ] |
| 35 | Company Booklet | The Story Narrative | Narrative matches symbol trade information. | [ ] |
| 36 | Company Booklet | Business Quality Card | Displays correct score and status pill. | [ ] |
| 37 | Company Booklet | Financial Sparklines | Renders SVG sparks for historical trend ranges. | [ ] |
| 38 | Company Booklet | Financial Offline Fallback | Renders unavailable block if fetch fails. | [ ] |
| 39 | Company Booklet | Ownership Shares Grid | DisplaysPromoters, FIIs, DIIs percentages. | [ ] |
| 40 | Company Booklet | Valuation Context Peer | Renders valuation comparisons cleanly. | [ ] |
| 41 | Company Booklet | Risks Cards Listing | Renders 3 clean operating risk modules. | [ ] |
| 42 | Company Booklet | Catalysts Section | Displays chronological events lists. | [ ] |
| 43 | Company Booklet | Timeline Announce Tracker| Shows milestones list for target ticker. | [ ] |
| 44 | Company Booklet | Related Companies Buttons | Lists peers and allows navigations on click. | [ ] |
| 45 | Watchlist | Load Watchlist Centre | Lists all watchlists. | [ ] |
| 46 | Watchlist | Create New Watchlist | New group appears in lists. | [ ] |
| 47 | Portfolio | Allocate equal weights | Computes aggregated quality factors correctly. | [ ] |
| 48 | Alerts | Mark All Read | Removes all active alert badges. | [ ] |
| 49 | Settings | Experience toggle | Updates onboarding state flags. | [ ] |
| 50 | Responsive | Mobile Scaling Check | Elements stack correctly at 320px width. | [ ] |

---

## SECTION 4 – KNOWN RISKS

1. **Network Fluctuations**: Under unstable cellular connections, parallel fetches in the Booklet page can load out-of-order, leading to brief layout shifts.
2. **Postgres Connection Pools**: If user load spikes suddenly during launch, backend Fastify queries might saturate the Postgres pool. Set `max: 20` pool size limits and leverage Redis caches.
3. **Third-party Quote API Latency**: The intraday quote fetch acts as a gatekeeper. If the external provider experiences delays, price charts will fallback to static close ranges.

---

## SECTION 5 – SUCCESS METRICS

1. **Signup Completion Rate**: Percentage of landing page visitors who successfully sign up (> 35%).
2. **Company Booklet Engagement**: Average time spent reading company booklet pages (> 3 minutes per session).
3. **Watchlist Creation Rate**: Percentage of users who create at least one custom watchlist (> 60%).
4. **Day-7 Retention**: Percentage of beta testers logging in at least once 7 days after signup (> 45%).

---

## SECTION 6 – POST-BETA ROADMAP
See [POST_BETA_ROADMAP.md](file:///c:/Users/Samvidh/OneDrive/Desktop/STOCKSTORY/PREDICTION-ENGINE/POST_BETA_ROADMAP.md) for priority lists.
