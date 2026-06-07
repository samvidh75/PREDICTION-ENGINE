# Agent I — Institutional Review Panel

## Overall Grade: C — Research-grade, not institutional-grade

### Reviewer Scores
#### Morningstar
- Data: C- | Methodology: B | Validation: B- | Transparency: A | Rigor: C+
- **Notes**: 30 stocks is unacceptable for fund rating. Methodology is well-documented but survivor-biased. Transparent audit trail is genuine differentiator.

#### MSCI
- Data: D | Methodology: C+ | Validation: C | Transparency: B+ | Rigor: C
- **Notes**: Factor construction is sound but universe too small for index inclusion. No sector model validation at scale.

#### AQR
- Data: D+ | Methodology: B- | Validation: C+ | Transparency: A- | Rigor: B-
- **Notes**: Academic-quality factor research but the empirical sample is insufficient. The self-audit is unusually honest — rare in fintech. Cheap Quality finding is consistent with academic literature (Fama-French value + quality premiums).

#### FactSet
- Data: C- | Methodology: B- | Validation: C | Transparency: B+ | Rigor: C+
- **Notes**: Comparable to early-stage quant research. Needs 100+ stocks before commercial viability. Data pipeline is clean but coverage is too narrow.

#### academicFinance
- Data: D | Methodology: B | Validation: B | Transparency: A | Rigor: B
- **Notes**: The open audit trail and willingness to publish negative findings (Future Health disproven, Old engine beats V2) is commendable and rare. The 30-stock universe is a fatal flaw for publication. The survivorship bias correction is the minimum bar for journal submission.

### Strengths
- Honest self-auditing culture
- Open audit trail from TRACK-48→51→53
- Statistically significant signal at 365d
- Replicable from open SQLite database
- Willingness to retire disproven claims

### Critical Weaknesses
- 30-stock universe — fatal for institutional adoption
- Survivorship bias unaddressed
- No train/test split — same data for discovery and validation
- No economic cycle test (2019-2025 was mostly bull)
- No third-party validation

### Path to Institutional Grade
- Expand to 100+ stocks with historical constituent reconstruction
- Run proper out-of-sample walk-forward (already started)
- Get independent academic review
- Model transaction costs and market impact
- Compare against NIFTY 50 benchmark with proper factor attribution
