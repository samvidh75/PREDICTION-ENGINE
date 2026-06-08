# TRACK-70 Agent G — Trust Centre Evidence Audit

**Generated:** 2026-06-07T13:26:03.994Z

## 1. Raw Database State

- **DB Exists:** ✓ YES
- **DB Error:** None
- **Tables found:** master_security_registry, symbols, daily_prices, sqlite_sequence, benchmark_observations, daily_prediction_snapshots, ranking_snapshots, feature_snapshots, factor_snapshots, financial_snapshots, prediction_registry, alpha_research_registry, model_registry, data_quality_registry, prediction_outcomes, corporate_actions, fundamental_registry, institutional_registry, manipulation_registry, explainability_registry, portfolio_doctor_registry, quality_registry, future_health_registry, quality_registry_v4, risk_registry, narrative_registry, prediction_ledger, claim_registry, model_comparison_registry, pipeline_health, outcome_registry_v2
- **Has prediction_registry table:** YES
- **Has registry table:** YES
- **Has factor/snapshot table:** YES
- **Has outcome table:** YES
- **Prediction rows:** 600210
- **Registry rows:** 301590

## 2. Accuracy Recalculation

**30d Accuracy:** CANNOT CALCULATE — Need prediction vs outcome join logic
**90d Accuracy:** CANNOT CALCULATE — Insufficient time range in DB
**365d Accuracy:** CANNOT CALCULATE — DB does not contain 1 year of data
**Cheap Quality:** CANNOT CALCULATE — Need quality scoring engine wired to DB

## 3. Claim Registry vs Trust Centre vs Reports

- **TrustCentrePage.tsx claims:** No explicit accuracy claims found
- **ClaimRegistry.ts exists:** NO


## 4. Evidence Consistency Check

**Report files mentioning trust/accuracy/evidence:**
- `reports/backtesting/factor-audit/DataQualityImpactReport.md`
- `reports/backtesting/factor-audit/FeatureQualityAudit.md`
- `reports/backtesting/fundamental-completion/FinancialAccuracyReport.md`
- `reports/track-13a2/CalibrationEvidence.md`
- `reports/track-18/EvidenceClassification.md`
- `reports/track-18/TrustworthinessMatrix.md`
- `reports/track-20/12-DataQualityEngine.md`
- `reports/track-20/TrustUXAudit.md`
- `reports/track-25/01-ClaimVerification.md`
- `reports/track-25/07-RankingQualityAudit.md`
- `reports/track-25b/04-DatabaseEvidence.md`
- `reports/track-43/07-DataQuality.md`
- `reports/track-45/agent-G-DataQualityRegistry.json`
- `reports/track-46/agent-J-PublicTrustCentre.json`
- `reports/track-46/agent-J-PublicTrustCentre.md`
- `reports/track-46B/02-QualityEngineV3.md`
- `reports/track-47/02-QualityValidation.md`
- `reports/track-47/06-TrustCentreV2.json`
- `reports/track-48/02-QualityAutopsy.json`
- `reports/track-48/06-TrustCentre.md`
- `reports/track-49/07-TrustCentreV4.json`
- `reports/track-49/07-TrustCentreV4.md`
- `reports/track-50/04-CheapQuality.json`
- `reports/track-50/04-CheapQuality.md`
- `reports/track-50/09-ClaimsAudit.json`
- `reports/track-51/01-QualityV4.json`
- `reports/track-51/03-CheapQuality.json`
- `reports/track-51/07-DataQualityCertification.md`
- `reports/track-51/08-PublicClaims.json`
- `reports/track-53/03-TrustAnalysis.md`
- `reports/track-53/07-CredibilityAudit.md`
- `reports/track-53/08-TrustCentreAudit.md`
- `reports/track-54/03-TrustAutomation.md`
- `reports/track-54/05-CheapQualityRetest.md`
- `reports/track-54/05-QualityV5.md`
- `reports/track-54/07-ClaimAudit.md`
- `reports/track-54/09-CheapQualityProduct.md`
- `reports/track-54/10-EvidenceRoadmap.md`
- `reports/track-54/SafeClaims.json`
- `reports/track-55/02-TrustMetrics.md`
- `reports/track-55/04-EvidenceDashboard.md`
- `reports/track-55/06-CheapQualityLive.md`
- `reports/track-55/08-TrustCentreV3.md`
- `reports/track-56/05-CheapQualityRevalidation.md`
- `reports/track-56/06-QualityV5Validation.md`
- `reports/track-59/06-QualityV5Production.md`
- `reports/track-59/07-TrustAutomation.md`
- `reports/track-60/03-ClaimRegistry.md`
- `reports/track-60/10-EvidenceSimulator.md`
- `reports/track-60/F6-EVIDENCE_ENGINE.md`
- `reports/track-60/G7-CLAIMS_PROTECTION.md`
- `reports/track-61/06-CLAIM_REVALIDATION.md`
- `reports/track-63/05-TrustVerification.md`
- `reports/track-63/06-UserEvidence.md`
- `reports/track-63/09-EvidenceDashboard.md`
- `reports/track-69/H-trust-certification.md`
- `reports/track-70/H-evidence-integrity.md`

## 5. Verdict

Database has 600210 prediction rows. Accuracy recalculation requires:
1. Actual outcome data in prediction_registry
2. Sufficient time series (30d, 90d, 365d)
3. Quality scoring engine wired to DB

**Current state: CANNOT VERIFY accuracy claims from raw data.**

## 6. Trust Centre Integrity Assessment

| Claim | Evidence Source | Verifiable? |
|-------|----------------|-------------|
| 30d accuracy | prediction_registry | Potentially (data exists) |
| 90d accuracy | prediction_registry | Potentially |
| 365d accuracy | prediction_registry | Potentially |
| Cheap Quality | quality scoring engine | Potentially |
