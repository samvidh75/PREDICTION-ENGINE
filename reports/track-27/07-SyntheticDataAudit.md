# TRACK-27 Phase 7: Synthetic Data Hunt

## Keyword Occurrences
| Location | Count |
|----------|-------|
| Production code | 424 |
| Test code | 0 |

## Production Code Hits (top 30)
- `src\backend\quality\companyDataQuality.ts:143` — `sample`: `"## Sample verification linkage",`
- `src\backend\web\routes\healthometer.ts:26` — `fallback`: `function asNum(raw: unknown, fallback: number): number {`
- `src\backend\web\routes\healthometer.ts:28` — `fallback`: `return Number.isFinite(n) ? n : fallback;`
- `src\backend\web\routes\intelligence.ts:80` — `demo`: `narrative100: `${sym} is demonstrating balanced factor metrics, placing it in a stable consolidation regime. High qualit`
- `src\backend\web\routes\intelligence.ts:48` — `fallback`: `// Fallback default snapshot for new/missing tickers, similar to clientIntelligenceProvider`
- `src\backend\web\routes\intelligence.ts:49` — `fallback`: `const fallback = {`
- `src\backend\web\routes\intelligence.ts:98` — `fallback`: `intelligenceCache.set(cacheKey, fallback);`
- `src\backend\web\routes\intelligence.ts:99` — `fallback`: `return fallback;`
- `src\backend\web\routes\intelligence.ts:395` — `fallback`: `// No hardcoded fallback — if no score changes are detected, return empty array.`
- `src\backend\web\routes\intelligence.ts:488` — `fallback`: `// Fallback: derive from financial_snapshots free_float`
- `src\backend\web\routes\intelligence.ts:546` — `fallback`: `// Fallback: compute from financial_snapshots`
- `src\backend\web\routes\intelligence.ts:906` — `fallback`: `// Fallback: news_articles table`
- `src\backend\web\routes\intelligence.ts:395` — `hardcoded`: `// No hardcoded fallback — if no score changes are detected, return empty array.`
- `src\backend\web\routes\investorState.ts:134` — `Math.random`: `id: Math.random().toString(36).substring(2, 9),`
- `src\backend\web\routes\investorState.ts:243` — `Math.random`: `id: Math.random().toString(36).substring(2, 9),`
- `src\components\assistant\AssistantContextPanel.tsx:94` — `fallback`: `const fallback: SectorId[] = ["Banking", "IT", "Energy"];`
- `src\components\assistant\AssistantContextPanel.tsx:95` — `fallback`: `const list = preferred.length ? preferred.slice(0, 3) : fallback;`
- `src\components\auth\AuthUXLoader.tsx:361` — `fallback`: `// Fallback — never shown in practice, all phases handled above`
- `src\components\auth\CinematicAuthGateway.tsx:202` — `placeholder`: `<input value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="Email address" type="email" class`
- `src\components\auth\CinematicAuthGateway.tsx:203` — `placeholder`: `<input value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="Password" type="password" c`
- `src\components\auth\CinematicAuthGateway.tsx:234` — `placeholder`: `<input value={signupName} onChange={(e) => setSignupName(e.target.value)} placeholder="Full name" className={inputClass}`
- `src\components\auth\CinematicAuthGateway.tsx:235` — `placeholder`: `<input value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} placeholder="Email address" type="email" cla`
- `src\components\auth\CinematicAuthGateway.tsx:236` — `placeholder`: `<input value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} placeholder="Password (min 6 character`
- `src\components\auth\CinematicAuthGateway.tsx:253` — `placeholder`: `<input value={recoveryEmail} onChange={(e) => setRecoveryEmail(e.target.value)} placeholder="Email address" type="email"`
- `src\components\CalibrationPlaceholder.tsx:3` — `placeholder`: `const CalibrationPlaceholder: React.FC = () => (`
- `src\components\CalibrationPlaceholder.tsx:17` — `placeholder`: `export default CalibrationPlaceholder;`
- `src\components\charts\chartData.ts:128` — `synthetic`: `export function getSyntheticChartSeries(ticker: string, timeframe: ChartTimeframe): ChartSeries {`
- `src\components\commandCentre\universalCommandCentre\CommandResultCard.tsx:19` — `synthetic`: `import { getSyntheticChartSeries } from "../../charts/chartData";`
- `src\components\commandCentre\universalCommandCentre\CommandResultCard.tsx:129` — `synthetic`: `const series = getSyntheticChartSeries(`${miniChartSeed}_${timeframe}_mini`, timeframe);`
- `src\components\community\CinematicConversationInterface.tsx:251` — `placeholder`: `placeholder={`

... +394 more


## Classification
⚠️ Mock/demo references found in production code

## Verdict
⚠️ Some references found — investigate for actual data path exposure.
