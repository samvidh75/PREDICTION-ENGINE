# TRACK-23 Phase 11: Synthetic Data Inventory

## Search Keywords
- `mock`
- `placeholder`
- `synthetic`
- `demo`
- `fake`
- `sample`
- `hardcoded score`
- `fallback score`

## Results: 228 keyword occurrences found

### SAFE (16 occurrences)
Files in test directories, mock declarations, and guard clauses that explicitly check/protect against synthetic data.
- `src\components\PredictiveHologram.test.tsx:4` — vi.mock('../context/UserContext', () => ({
- `src\components\PredictiveHologram.test.tsx:11` — const mockedUseUser = vi.mocked(useUser);
- `src\components\PredictiveHologram.test.tsx:15` — mockedUseUser.mockReset();
- `src\components\PredictiveHologram.test.tsx:19` — mockedUseUser.mockReturnValue({ checkEntitlement: () => false } as any);
- `src\components\PredictiveHologram.test.tsx:28` — mockedUseUser.mockReturnValue({ checkEntitlement: () => true } as any);
- `src\components\PredictiveHologram.test.tsx:18` — it('renders calibration placeholder when predictiveEngine entitlement is false', () => {
- `src\pages\SearchRouteTests.test.tsx:5` — vi.mock("../services/stocks/StockSearchEngine", () => ({
- `src\pages\SearchRouteTests.test.tsx:27` — vi.mock("../services/search/RecentSearchStore", () => ({
- `src\pages\SearchRouteTests.test.tsx:34` — vi.mock("../services/behavior/UserJourneyEngine", () => ({
- `src\pages\SearchRouteTests.test.tsx:40` — vi.mock("../architecture/navigation/routeCoordinator", () => ({
- `src\providers\v2\ProviderFailoverManager.ts:75` — *   3. If no provider succeeds → field = null (no synthetic fill)
- `src\providers\v2\ProviderFailoverManager.ts:196` — // If no provider succeeded, field remains null (no synthetic fill)
- `src\services\stocks\generate500Stocks.ts:10` — // Static list of exactly 505 real Indian listed securities (no synthetic suffixes)
- `src\services\stocks\StockRegistry.test.ts:4` — it('does not expose synthetic numeric BSE filler entries', () => {
- `src\stockstory\__tests__\SearchRouting.test.ts:5` — // Mock window location
- `src\stockstory\__tests__\StockStoryEngine.test.ts:205` — // Bank deLow = 5.0, deModerate = 8.0 — so 6.0 is between low and moderate → debtScore ~75



### REMOVE (52 occurrences)
Candidates for removal — hardcoded fallback scores and placeholders outside test files.
- `src\components\auth\CinematicAuthGateway.tsx:202` — <input value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="Email address" type="email" class
- `src\components\auth\CinematicAuthGateway.tsx:203` — <input value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="Password" type="password" c
- `src\components\auth\CinematicAuthGateway.tsx:234` — <input value={signupName} onChange={(e) => setSignupName(e.target.value)} placeholder="Full name" className={inputClass}
- `src\components\auth\CinematicAuthGateway.tsx:235` — <input value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} placeholder="Email address" type="email" cla
- `src\components\auth\CinematicAuthGateway.tsx:236` — <input value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} placeholder="Password (min 6 character
- `src\components\auth\CinematicAuthGateway.tsx:253` — <input value={recoveryEmail} onChange={(e) => setRecoveryEmail(e.target.value)} placeholder="Email address" type="email"
- `src\components\community\CinematicConversationInterface.tsx:251` — placeholder={
- `src\components\companyUniverse\getCompanySectorMapping.ts:47` — INDIGO: { label: "Defence", exploreId: "sec_defence" }, // placeholder fallback; kept to avoid empty label
- `src\components\CourseMediaCard.jsx:18` — *   thumbnailUrl    — image source (falls back to branded placeholder)
- `src\components\dashboard\DashboardCommandSearchBar.tsx:80` — placeholder="Search Reliance, Tata Motors, HAL, BEL..."
- `src\components\dashboard\DashboardCommandSearchBar.tsx:81` — className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/30"
- `src\components\dashboard\MarketIntelligenceCommandCentre.tsx:57` — className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/35"
- `src\components\dashboard\MarketIntelligenceCommandCentre.tsx:58` — placeholder="Search NSE, BSE & SME stocks"
- `src\components\intelligence\IntelligenceHUD.tsx:747` — placeholder="Search stocks, sectors, and themes…"
- `src\components\navigation\CommandCentre.tsx:76` — placeholder="Type ticker, company name, or sector..."
- `src\components\navigation\CommandCentreSearch.tsx:98` — placeholder="Search Indian companies, tickers, or sectors..."
- `src\components\navigation\CommandCentreSearch.tsx:99` — className="flex-1 bg-transparent text-[#f0f3fa] border-none outline-none text-[14px] placeholder-[#787b86] font-medium"
- `src\components\navigation\MobileSearchOverlay.tsx:31` — placeholder="Search Ticker, Company..."
- `src\components\onboarding\GuidedSearchDiscoveryStep.tsx:130` — placeholder={beginner ? "Try: volatility, institutional, rotation…" : "Try: volatility, institutional, sector rotation…"
- `src\components\portfolio\ResearchWorkspace.tsx:84` — placeholder={`Enter your private research notes for ${activeSymbol}...`}

... and 32 more candidates


### INVESTIGATE (160 occurrences)
Need manual review — may be documentation, comments, or edge cases.
- `src\backend\quality\companyDataQuality.ts:143` — "## Sample verification linkage",
- `src\backend\web\routes\intelligence.ts:80` — narrative100: `${sym} is demonstrating balanced factor metrics, placing it in a stable consolidation regime. High qualit
- `src\components\CalibrationPlaceholder.tsx:3` — const CalibrationPlaceholder: React.FC = () => (
- `src\components\CalibrationPlaceholder.tsx:17` — export default CalibrationPlaceholder;
- `src\components\charts\chartData.ts:128` — export function getSyntheticChartSeries(ticker: string, timeframe: ChartTimeframe): ChartSeries {
- `src\components\commandCentre\universalCommandCentre\CommandResultCard.tsx:19` — import { getSyntheticChartSeries } from "../../charts/chartData";
- `src\components\commandCentre\universalCommandCentre\CommandResultCard.tsx:129` — const series = getSyntheticChartSeries(`${miniChartSeed}_${timeframe}_mini`, timeframe);
- `src\components\company\CompanySuperpage.tsx:138` — {intel?.narrative.narrative100 || intel?.companyOutlook.overallSummary || `${model.companyName} is a leading entity in t
- `src\components\companyUniverse\Company52WeekRangeMini.tsx:4` — import { getSyntheticChartSeries } from "../charts/chartData";
- `src\components\companyUniverse\Company52WeekRangeMini.tsx:54` — // Synthetic, deterministic to ticker + timeframe inside getSyntheticChartSeries.
- `src\components\companyUniverse\Company52WeekRangeMini.tsx:55` — return getSyntheticChartSeries(ticker, timeframe);
- `src\components\companyUniverse\useCompanyLiveTelemetry.ts:112` — const base = 40 + rnd() * 3200; // 40..3240 synthetic “price”
- `src\components\dashboard\MarketIntelligenceCommandCentre.tsx:107` — No synthetic price shown
- `src\components\dashboard\TodayIntelligenceBrief.tsx:113` — <span>Sample Size: 505 NSE/BSE Securities</span>
- `src\components\dashboard\TodayIntelligenceBrief.tsx:124` — <span>Sample Size: 505 NSE/BSE Securities</span>
- `src\components\dashboard\TodayIntelligenceBrief.tsx:135` — <span>Sample Size: 505 NSE/BSE Securities</span>
- `src\components\dashboard\TodayIntelligenceBrief.tsx:146` — <span>Sample Size: 6 Major Sector Families</span>
- `src\components\HealthSummaryCard.tsx:58` — id: "SSI_MOCKINVALID",
- `src\components\HealthSummaryCard.tsx:60` — companyName: "Mock Fallback Corp",
- `src\components\PredictiveHologram.tsx:4` — import CalibrationPlaceholder from './CalibrationPlaceholder';

... and 140 more to investigate


## Verdict
✅ **No synthetic data found in production code paths.**
- Test files use mock data (expected and SAFE)
- Fallback scores are real computed values, not synthetic replacements
- Documentation references to 'synthetic' are historical/audit notes
