# Snapshot Migration Report

## Audit of Snapshot Usage

This report documents every usage of `clientIntelligenceProvider`, `INTELLIGENCE_VALIDATION_REPORT`, and hardcoded intelligence snapshots within the codebase.

### 1. File: `clientIntelligenceProvider.ts`
- **Path**: [clientIntelligenceProvider.ts](file:///c:/Users/Samvidh/OneDrive/Desktop/STOCKSTORY/PREDICTION-ENGINE/src/services/intelligence/clientIntelligenceProvider.ts)
- **Role**: Serves hardcoded static data from the `staticIntelligenceData` object.
- **Functions Exposed**:
  - `getCompanyIntelligence(symbol)`
  - `getMarketIntelligence()`
  - `getSectorIntelligence(sector)`
  - `getPortfolioIntelligence()`

### 2. Consumers of `clientIntelligenceProvider`
- **[CompanySuperpage (view)](file:///c:/Users/Samvidh/OneDrive/Desktop/STOCKSTORY/PREDICTION-ENGINE/src/views/CompanySuperpage.tsx)**:
  - Calls `getCompanyIntelligence(symbol)` to render the main snapshot card.
  - Calls `getMarketIntelligence()` and `getPortfolioIntelligence()` for contextual indicators.
- **[CompanySuperpage (component)](file:///c:/Users/Samvidh/OneDrive/Desktop/STOCKSTORY/PREDICTION-ENGINE/src/components/company/CompanySuperpage.tsx)**:
  - Calls `getCompanyIntelligence(ticker)` to populate the Progressive Disclosure steps.
- **[TodayIntelligenceBrief](file:///c:/Users/Samvidh/OneDrive/Desktop/STOCKSTORY/PREDICTION-ENGINE/src/components/dashboard/TodayIntelligenceBrief.tsx)**:
  - Calls `getMarketIntelligence()` to render the daily brief.
- **[SectorRotationEcosystem](file:///c:/Users/Samvidh/OneDrive/Desktop/STOCKSTORY/PREDICTION-ENGINE/src/components/dashboard/SectorRotationEcosystem.tsx)**:
  - Calls `getSectorIntelligence(sector)` within the loop over basic sectors.
- **[PortfolioPage](file:///c:/Users/Samvidh/OneDrive/Desktop/STOCKSTORY/PREDICTION-ENGINE/src/pages/PortfolioPage.tsx)**:
  - Calls `getPortfolioIntelligence()` to display concentration risk, diversification status, factor and sector exposure profiles.
- **[newsStoryEngine.ts](file:///c:/Users/Samvidh/OneDrive/Desktop/STOCKSTORY/PREDICTION-ENGINE/src/services/news/newsStoryEngine.ts)**:
  - Imports `getCompanyIntelligence` to generate news stories. (Will be updated or bypassed if necessary, but success criteria states "No user-facing page depends on validation snapshots").

### 3. Usage of `INTELLIGENCE_VALIDATION_REPORT.json`
- **Path**: `reports/INTELLIGENCE_VALIDATION_REPORT.json`
- **Role**: Written by `run-intelligence-validation.ts` during offline validation runs. It is not consumed by the web server directly; it serves as a check for the validity of the computed values.

---
## Migration Plan Execution
All usages of the above hardcoded static retrievals will be replaced with runtime async API requests fetching from the new `/api/intelligence/...` backend endpoints.
