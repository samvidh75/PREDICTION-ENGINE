# LLM Gateway Interface — Phase 6

## Interface Design
Located: `src/stockstory/gateway/`

### LLMProvider Interface
Defined in `src/stockstory/gateway/types.ts`:
- `name: string` — Provider name
- `mode: LLMGatewayMode` — `'deterministic' | 'disabled' | 'mock'`
- `generateThesis(input): StockStoryNarrativeOutput`
- `parseScannerQuery(query): ScannerQueryPlan`
- `explainScoreChange(input): string`
- `summarizeNewsContext(input): string`
- `generateAlertExplanation(input): string`
- `generateCompareSummary(input): string`

### LLMGateway Class
Defined in `src/stockstory/gateway/LLMGateway.ts`:
- Routes to active provider based on `LLM_GATEWAY_MODE`
- Validates all output through `ResearchOutputValidator`
- Falls back to deterministic narrative on validation failure
- Emits observability events for every call

## Provider Modes

| Mode | Provider | Description |
|------|----------|-------------|
| `deterministic` (default) | DeterministicNarrativeProvider | Wraps ResearchNarrativeService, no LLM calls |
| `disabled` | DisabledLLMProvider | Returns clean "not available" state |
| `mock` | MockLLMProvider | Returns fixture output for testing |

## Config
Located: `src/stockstory/gateway/config.ts`
- `LLM_GATEWAY_MODE` env var (default: `deterministic`)
- `getLLMGatewayConfig()`, `setLLMGatewayConfig()`

## Fallback Behavior
1. If provider throws → fallback to deterministic narrative
2. If validation fails → fallback to deterministic narrative
3. If all fails → return clean disabled narrative ("not available")

## Validation Behavior
- All gateway output passes `ResearchOutputValidator.validate()`
- Failed validation is logged internally via observability
- Raw model errors are never exposed to users

## RouteLLM / SGLang Confirmation
- RouteLLM: **Not integrated** — confirmed by codebase search
- SGLang: **Not integrated** — confirmed by codebase search
- No network calls made by any provider
- No API keys required
- No model-serving infrastructure

## Tests
- `src/stockstory/gateway/__tests__/LLMGateway.test.ts` — 12 tests
- Covers deterministic, mock, disabled modes
- Covers scanner parsing, alert explanation, compare summary
- Covers observability event emission
