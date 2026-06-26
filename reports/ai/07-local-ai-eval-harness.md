# Local AI Eval Harness — Phase 8

## Eval Cases
Located: `tests/fixtures/ai-evals/cases.ts` — 14 eval cases

| ID | Task | Description |
|----|------|-------------|
| company-thesis-excellent | generate_thesis | Excellent company profile |
| company-thesis-at-risk | generate_thesis | At-risk company profile |
| score-change-improvement | generate_thesis | Improved profile with strong context |
| scanner-query-quality | parse_scanner_query | Quality compounders query |
| scanner-query-unsupported | parse_scanner_query | Unsupported semantic query |
| compliance-sensitive-output | generate_thesis | Compliance-safe narrative |
| forbidden-copy-rejection | generate_thesis | No forbidden backend terms |
| null-heavy-engine-input | generate_thesis | Minimal data input |
| conflicting-factors | generate_thesis | High quality + low valuation |
| dividend-trap | generate_thesis | Unsustainable yield scenario |
| smallcap-risk | generate_thesis | Small cap with elevated risk |
| high-quality-expensive | generate_thesis | Premium quality, demanding price |
| weak-fundamentals-strong-momentum | generate_thesis | Price momentum without fundamentals |
| strong-fundamentals-weak-momentum | generate_thesis | Fundamentals cheap but out of favour |

## Eval Script
Located: `scripts/run-ai-eval.ts`
- Command: `npm run eval:ai:local`
- Runs all 14 eval cases through deterministic provider
- Validates schema compliance
- Checks for forbidden terms using policy guardrails
- Checks required concepts are present
- Reports pass/fail per case
- Generates `reports/ai/local-eval-results.md`

## Pass/Fail Summary
- **Current: 14/14 PASS**
- All cases pass with deterministic provider
- Schema validation passes for all cases
- No forbidden terms detected in any output
- Required concepts present in all cases

## Known Gaps
- Eval harness uses deterministic provider only (no LLM comparison yet)
- No automated quality rubric scoring (human evaluation needed for tone)
- No regression detection between provider versions
- No latency/cost benchmarks yet

## Future RouteLLM/SGLang Evaluation
- Same eval cases can be used to evaluate RouteLLM or SGLang output
- Compare quality metrics between deterministic and LLM providers
- Track schema compliance for each provider
- Measure hallucination rate using forbidden concept detection
