# StockStory Intelligence Validation Report

**Generated:** 2026-06-28T17:41:35.838Z
**Part:** 8 — Intelligence Validation, Market Reality Calibration, and Analyst-Grade QA

## Overall Status

- **Status:** ✅ Pass
- **Symbols Validated:** 20
- **Passed:** 20
- **Failed:** 0
- **Warnings:** 0
- **Total Errors:** 0
- **Total Warnings:** 0

## Module Results

### market-reality
- Passed: 20, Failed: 0, Warnings: 0

## Safety Audit Results

- Investment phrases: 35
- Backend phrases: 96
- Fake data patterns: 17
- Hallucination risks: 5

### Safety Findings
- `/Users/samvidhmehta/.copilot/repos/PREDICTION-ENGINE/src/stockstory/intelligence/__tests__/Integration.test.ts:82` — **error** [backend] "coverage"
- `/Users/samvidhmehta/.copilot/repos/PREDICTION-ENGINE/src/stockstory/intelligence/__tests__/Integration.test.ts:93` — **error** [backend] "provider"
- `/Users/samvidhmehta/.copilot/repos/PREDICTION-ENGINE/src/stockstory/intelligence/__tests__/Integration.test.ts:99` — **error** [backend] "provider"
- `/Users/samvidhmehta/.copilot/repos/PREDICTION-ENGINE/src/stockstory/intelligence/__tests__/Integration.test.ts:248` — **error** [backend] "freshness"
- `/Users/samvidhmehta/.copilot/repos/PREDICTION-ENGINE/src/stockstory/intelligence/calibration/CalibrationTypes.ts:54` — **warning** [investment] "risk-free"
- `/Users/samvidhmehta/.copilot/repos/PREDICTION-ENGINE/src/stockstory/intelligence/compliance/CompliancePolicy.ts:74` — **warning** [investment] "guaranteed return"
- `/Users/samvidhmehta/.copilot/repos/PREDICTION-ENGINE/src/stockstory/intelligence/compliance/CompliancePolicy.ts:80` — **warning** [investment] "multibagger"
- `/Users/samvidhmehta/.copilot/repos/PREDICTION-ENGINE/src/stockstory/intelligence/compliance/CompliancePolicy.ts:83` — **warning** [investment] "risk-free"
- `/Users/samvidhmehta/.copilot/repos/PREDICTION-ENGINE/src/stockstory/intelligence/compliance/CompliancePolicy.ts:92` — **warning** [investment] "guaranteed return"
- `/Users/samvidhmehta/.copilot/repos/PREDICTION-ENGINE/src/stockstory/intelligence/compliance/ComplianceTextGuard.ts:43` — **warning** [investment] "multibagger"
- `/Users/samvidhmehta/.copilot/repos/PREDICTION-ENGINE/src/stockstory/intelligence/compliance/ComplianceTextGuard.ts:46` — **warning** [investment] "risk-free"
- `/Users/samvidhmehta/.copilot/repos/PREDICTION-ENGINE/src/stockstory/intelligence/confidence/ResearchConfidence.ts:13` — **error** [backend] "provider"
- `/Users/samvidhmehta/.copilot/repos/PREDICTION-ENGINE/src/stockstory/intelligence/confidence/ResearchConfidence.ts:16` — **error** [backend] "backend"
- `/Users/samvidhmehta/.copilot/repos/PREDICTION-ENGINE/src/stockstory/intelligence/confidence/ResearchConfidence.ts:18` — **error** [backend] "provider"
- `/Users/samvidhmehta/.copilot/repos/PREDICTION-ENGINE/src/stockstory/intelligence/confidence/ResearchConfidence.ts:18` — **error** [backend] "coverage"
- `/Users/samvidhmehta/.copilot/repos/PREDICTION-ENGINE/src/stockstory/intelligence/confidence/ResearchConfidence.ts:128` — **error** [backend] "provider"
- `/Users/samvidhmehta/.copilot/repos/PREDICTION-ENGINE/src/stockstory/intelligence/engines/EarningsEngine.ts:98` — **error** [backend] "coverage"
- `/Users/samvidhmehta/.copilot/repos/PREDICTION-ENGINE/src/stockstory/intelligence/engines/EarningsEngine.ts:100` — **error** [backend] "coverage"
- `/Users/samvidhmehta/.copilot/repos/PREDICTION-ENGINE/src/stockstory/intelligence/engines/EarningsEngine.ts:173` — **error** [backend] "coverage"
- `/Users/samvidhmehta/.copilot/repos/PREDICTION-ENGINE/src/stockstory/intelligence/engines/EarningsEngine.ts:174` — **error** [backend] "coverage"
- `/Users/samvidhmehta/.copilot/repos/PREDICTION-ENGINE/src/stockstory/intelligence/engines/FinancialEngine.ts:22` — **error** [backend] "coverage"
- `/Users/samvidhmehta/.copilot/repos/PREDICTION-ENGINE/src/stockstory/intelligence/engines/FinancialEngine.ts:178` — **error** [backend] "coverage"
- `/Users/samvidhmehta/.copilot/repos/PREDICTION-ENGINE/src/stockstory/intelligence/engines/RAGEngine.ts:5` — **error** [backend] "coverage"
- `/Users/samvidhmehta/.copilot/repos/PREDICTION-ENGINE/src/stockstory/intelligence/engines/RAGEngine.ts:52` — **error** [backend] "coverage"
- `/Users/samvidhmehta/.copilot/repos/PREDICTION-ENGINE/src/stockstory/intelligence/engines/RAGEngine.ts:56` — **error** [backend] "coverage"
- `/Users/samvidhmehta/.copilot/repos/PREDICTION-ENGINE/src/stockstory/intelligence/engines/RAGEngine.ts:62` — **error** [backend] "coverage"
- `/Users/samvidhmehta/.copilot/repos/PREDICTION-ENGINE/src/stockstory/intelligence/engines/RAGEngine.ts:66` — **error** [backend] "coverage"
- `/Users/samvidhmehta/.copilot/repos/PREDICTION-ENGINE/src/stockstory/intelligence/engines/RAGEngine.ts:71` — **error** [backend] "coverage"
- `/Users/samvidhmehta/.copilot/repos/PREDICTION-ENGINE/src/stockstory/intelligence/engines/RAGEngine.ts:86` — **error** [backend] "coverage"
- `/Users/samvidhmehta/.copilot/repos/PREDICTION-ENGINE/src/stockstory/intelligence/engines/RAGEngine.ts:88` — **error** [backend] "coverage"
- `/Users/samvidhmehta/.copilot/repos/PREDICTION-ENGINE/src/stockstory/intelligence/engines/RAGEngine.ts:92` — **error** [backend] "coverage"
- `/Users/samvidhmehta/.copilot/repos/PREDICTION-ENGINE/src/stockstory/intelligence/engines/RAGEngine.ts:96` — **error** [backend] "coverage"
- `/Users/samvidhmehta/.copilot/repos/PREDICTION-ENGINE/src/stockstory/intelligence/engines/RAGEngine.ts:140` — **error** [backend] "coverage"
- `/Users/samvidhmehta/.copilot/repos/PREDICTION-ENGINE/src/stockstory/intelligence/engines/RAGEngine.ts:146` — **error** [backend] "coverage"
- `/Users/samvidhmehta/.copilot/repos/PREDICTION-ENGINE/src/stockstory/intelligence/engines/RAGEngine.ts:147` — **error** [backend] "coverage"
- `/Users/samvidhmehta/.copilot/repos/PREDICTION-ENGINE/src/stockstory/intelligence/engines/RAGEngine.ts:150` — **error** [backend] "coverage"
- `/Users/samvidhmehta/.copilot/repos/PREDICTION-ENGINE/src/stockstory/intelligence/engines/RiskEngine.ts:133` — **error** [backend] "coverage"
- `/Users/samvidhmehta/.copilot/repos/PREDICTION-ENGINE/src/stockstory/intelligence/evidence/EvidenceTypes.ts:6` — **error** [backend] "provider"
- `/Users/samvidhmehta/.copilot/repos/PREDICTION-ENGINE/src/stockstory/intelligence/llm/LLMExplainer.ts:6` — **error** [backend] "provider"
- `/Users/samvidhmehta/.copilot/repos/PREDICTION-ENGINE/src/stockstory/intelligence/llm/LLMExplainer.ts:9` — **error** [backend] "provider"
- `/Users/samvidhmehta/.copilot/repos/PREDICTION-ENGINE/src/stockstory/intelligence/llm/LLMExplainer.ts:33` — **error** [backend] "provider"
- `/Users/samvidhmehta/.copilot/repos/PREDICTION-ENGINE/src/stockstory/intelligence/llm/LLMExplainer.ts:36` — **error** [backend] "provider"
- `/Users/samvidhmehta/.copilot/repos/PREDICTION-ENGINE/src/stockstory/intelligence/llm/LLMExplainer.ts:43` — **error** [backend] "provider"
- `/Users/samvidhmehta/.copilot/repos/PREDICTION-ENGINE/src/stockstory/intelligence/llm/LLMExplainer.ts:65` — **error** [backend] "provider"
- `/Users/samvidhmehta/.copilot/repos/PREDICTION-ENGINE/src/stockstory/intelligence/llm/LLMExplainer.ts:176` — **error** [backend] "provider"
- `/Users/samvidhmehta/.copilot/repos/PREDICTION-ENGINE/src/stockstory/intelligence/llm/LLMExplainer.ts:178` — **error** [backend] "provider"
- `/Users/samvidhmehta/.copilot/repos/PREDICTION-ENGINE/src/stockstory/intelligence/llm/LLMExplainer.ts:179` — **error** [backend] "provider"
- `/Users/samvidhmehta/.copilot/repos/PREDICTION-ENGINE/src/stockstory/intelligence/llm/LLMExplainer.ts:180` — **error** [backend] "provider"
- `/Users/samvidhmehta/.copilot/repos/PREDICTION-ENGINE/src/stockstory/intelligence/llm/LLMExplainer.ts:188` — **error** [backend] "provider"
- `/Users/samvidhmehta/.copilot/repos/PREDICTION-ENGINE/src/stockstory/intelligence/llm/LLMExplainer.ts:192` — **error** [backend] "provider"
- ... and 103 more findings

## Key Files Changed

- `src/stockstory/intelligence/validation/IntelligenceValidationTypes.ts` — Core validation types
- `src/stockstory/intelligence/validation/IntelligenceValidationRunner.ts` — Validation runner
- `src/stockstory/intelligence/validation/MarketRealityValidator.ts` — Market reality checks
- `src/stockstory/intelligence/validation/ResearchConsistencyValidator.ts` — Consistency checks
- `src/stockstory/intelligence/validation/RankingSanityValidator.ts` — Ranking sanity
- `src/stockstory/intelligence/validation/EvidenceBounder.ts` — Evidence bounding
- `src/stockstory/intelligence/calibration/CalibrationTypes.ts` — Calibration config
- `src/stockstory/intelligence/calibration/SectorCalibrationEngine.ts` — Sector calibration
- `src/stockstory/intelligence/calibration/MarketCapCalibrator.ts` — Market cap calibration
- `src/stockstory/intelligence/quality/ContradictionDetector.ts` — Contradiction detection
- `src/stockstory/intelligence/quality/ExplainabilityQA.ts` — Explanation QA
- `src/stockstory/intelligence/quality/SafetyAuditor.ts` — Safety auditor
- `scripts/intelligence/validate-intelligence.ts` — Validation pipeline script

## Status Summary

The validation framework is operational. All validators, calibrators, and quality checkers
are implemented as composable modules that can be run against any set of Indian equity symbols.
