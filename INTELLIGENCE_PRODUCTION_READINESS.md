# Intelligence Production Readiness Report

This report evaluates and classifies the production readiness of StockStory's intelligence surfaces, specifying their reliance on live engine calculations vs static development fallbacks.

---

## Readiness Classification

| Surface | Classification | Rationale |
|---|---|---|
| **CompanySuperpage** | **PARTIAL** | Core stock price tickers and DNA gauges update dynamically from the live orchestrator hook, but the structured factor ratings, explanations, and narratives are populated from static snapshots. |
| **Dashboard** | **STATIC** | Displays the pre-computed "Today's Intelligence Brief" from static validation outputs; does not trigger live runtime DB updates. |
| **SectorExplorer** | **STATIC** | Uses the pre-compiled sector strength and rotation indicators from validation snapshot outputs. |
| **PortfolioPage** | **PARTIAL** | Dynamically calculates portfolio value, individual sector percentages, and weights based on active holdings, but overlays style factor exposures (Quality, Value, Momentum) from pre-calculated batch values. |
| **MarketStories** | **PARTIAL** | Compiles news layers progressively at browser runtime using the story builder engine, while fetching the textual narratives from pre-computed company snapshots. |

---

## Key Production Readiness Barriers

1. **Vite Browser Bundling**:
   - Vite is designed to bundle client-side code. It cannot execute PG queries directly because `pg` (node-postgres) is a Node.js-only dependency.
   - For complete runtime dynamic calculations, these engines must execute on a server backend (such as Fastify/Next.js serverless functions) and be fetched by the React components via API calls (e.g. `/api/company/intelligence`).

2. **Snapshot Fallback Verdict**:
   - The current snapshot pattern is an excellent development fallback that prevents Vite build failures and maintains smooth UI rendering.
   - For full production deployment, the Fastify endpoints must be wired to execute the engines on-demand and expose REST interfaces for the frontend surfaces to consume.
