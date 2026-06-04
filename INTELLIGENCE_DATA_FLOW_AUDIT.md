# Intelligence Data Flow Audit

This document traces the data pipelines for every intelligence surface integrated into StockStory, mapping from the UI down to the data warehouse or static source.

---

## 1. Company Superpage
```
UI (views/CompanySuperpage.tsx)
  ↓
Provider (getCompanyIntelligence in clientIntelligenceProvider.ts)
  ↓
Static Snapshot (Hardcoded staticIntelligenceData object)
```
- **Analysis**: The component reads from `clientIntelligenceProvider.ts` using static lookup keys. No runtime queries to PostgreSQL or real-time feature recomputation occur in the browser context.

---

## 2. Dashboard (Today's Intelligence Brief)
```
UI (TodayIntelligenceBrief.tsx)
  ↓
Provider (getMarketIntelligence in clientIntelligenceProvider.ts)
  ↓
Static Snapshot (Hardcoded staticIntelligenceData object)
```
- **Analysis**: The dashboard widget displays the pre-calculated market outlook. It does not query the active database connection or invoke `MarketIntelligenceEngine` at browser runtime.

---

## 3. Sector Explorer
```
UI (SectorRotationEcosystem.tsx)
  ↓
Provider (getSectorIntelligence in clientIntelligenceProvider.ts)
  ↓
Static Snapshot (Hardcoded staticIntelligenceData object)
```
- **Analysis**: The sector exploration cards fetch structured ratings directly from the static provider file.

---

## 4. Portfolio Page
```
UI (PortfolioPage.tsx)
  ↓
Provider (getPortfolioIntelligence in clientIntelligenceProvider.ts)
  ↓
Static Snapshot (Hardcoded staticIntelligenceData object)
```
- **Analysis**: The coach advice panel and allocations map directly to the static portfolio snapshot.

---

## 5. Market Stories
```
UI (CalmMarketNewsStoryPanel.tsx)
  ↓
Engine (newsStoryEngine.ts)
  ↓
Provider (getCompanyIntelligence in clientIntelligenceProvider.ts)
  ↓
Static Snapshot (Hardcoded staticIntelligenceData object)
```
- **Analysis**: The news panel triggers the story compiler engine in `newsStoryEngine.ts`, which queries the company's computed factor summaries from the client-side provider.
