# F2 Information Architecture — Moneycontrol Competitor Benchmark

Date: 2026-06-12  
Branch: `track-f2-refined-information-architecture`

## Objective

Turn StockStory India into a more refined decision-intelligence product for Indian equity investors. The objective is not to reproduce Moneycontrol's breadth or density. The objective is to cover the core investor jobs with a cleaner information architecture, stronger trust states, and explainable ranking workflows.

## Current Moneycontrol Surface Observed

The current Moneycontrol homepage and primary navigation expose a broad financial portal surface, including:

- account utilities: portfolio, watchlist, alerts, price alerts;
- market action: indices, gainers, losers, volume and price shockers, active stocks;
- research: technical trends, technical analysis, fundamental scanner, technical scanner, sector analysis, earnings, IPO, ETFs, FII/DII activity, corporate actions;
- adjacent verticals: mutual funds, personal finance, commodities, currency, crypto, news, video, forum and learning content.

Reference: `https://www.moneycontrol.com/` accessed on 2026-06-12.

## StockStory Existing Surface

StockStory already routes a substantial product surface:

- Market: dashboard, search, discovery, daily feed;
- Research: analysis, comparison, rankings, leaderboard, academy;
- Portfolio: portfolio, watchlist, alerts, Portfolio Doctor, prediction journal, workspace;
- Trust: Trust Centre and settings;
- Stock intelligence: company and stock detail pages with horizon-aware StockStory prediction flows.

The primary defect was discoverability. The desktop sidebar and mobile drawer exposed only seven modules even though the application routed materially more functionality.

## F2.0 Patch Applied

This branch implements the first refinement pass:

1. Centralized view-to-route and route-to-view mapping in `src/context/LayoutContext.tsx`.
2. Expanded desktop navigation into four investor-job groups: Market, Research, Portfolio and System.
3. Mirrored the grouped information architecture in the mobile drawer while preserving the compact four-tab mobile bar.
4. Fixed authenticated routes that could resolve to an empty shell: `predictions`, `rankings`, `methodology`, `validation`, and `brief`.
5. Added a deterministic dashboard fallback for any unmapped authenticated route.
6. Added missing protected-page declarations for private intelligence modules.
7. Added route-mapping regression tests.

## Product Positioning

Moneycontrol is a broad portal. StockStory should be a narrower, higher-signal operating system for equity decisions:

- **less clutter:** group modules by investor job rather than content vertical;
- **more honest:** display unavailable states instead of synthetic metrics;
- **more explainable:** link rankings, comparisons, horizon-aware stock stories and prediction journals;
- **more actionable:** place watchlists, alerts and Portfolio Doctor adjacent to research outputs;
- **more refined:** use a consistent shell on desktop and mobile instead of hiding product modules behind direct URLs.

## Next Execution Tracks

### F2.1 Stock Detail Refinement

- unify quote, exchange, freshness and prediction-availability states;
- add a compact fundamentals and technical snapshot with explicit source provenance;
- provide comparison and alert actions within the stock workspace;
- keep unavailable metrics explicit.

### F2.2 Market Dashboard and Scanners

- introduce gainers, losers, volume shockers, sector movers and ranked discovery views;
- add saved scanner presets based on live fields that are actually populated;
- expose technical scanner features only after snapshot or runtime-indicator availability is certified.

### F2.3 Portfolio Operating System

- connect portfolio holdings to Portfolio Doctor, alerts and StockStory rankings;
- add contribution, concentration and risk views;
- add actionable review queues rather than generic score cards.

### F2.4 Feed and Learning

- integrate Daily Feed, Academy and Trust Centre into stock and portfolio workflows;
- prioritize source attribution, freshness and investor education.

### F2.5 Quality Gates

- add browser journeys for grouped navigation;
- add screenshot-based visual review for desktop and mobile breakpoints;
- preserve existing truthfulness gates, authenticated alert tests, horizon selector tests and deployment smoke checks.

## Active Dependencies

- F1 provider repair remains in draft PR #12 and should be reviewed separately.
- Preview deployment failures caused by Vercel build-rate limits are external account-capacity failures, not source-build failures.
- Railway backend health must be verified separately before a production release is certified.
