# SSI Intelligence Layer — Product Architecture

## 1. Prediction Intelligence

### Model Output
- Display `ranking_score` from prediction_registry when available
- Show classification (Exceptional/Excellent/Good/Fair/Weak/Critical)
- When unavailable: "Model output available; explanation layer pending"

### Score
- Composite `ranking_score` (0-100) from prediction_registry
- Display as numeric with classification badge
- No color-coded green/red — use semantic token colors

### Confidence
- `confidence_score` (0-100) from prediction_registry
- Display as confidence bar
- `confidence_level`: Very High / High / Medium / Low
- When unavailable: "Confidence data pending"

### Factor Drivers
- 6 factors from `factor_snapshots`: quality, value, growth, momentum, risk, sector_strength
- Display as factor grid with scores
- "Factor context" not "causal explanation" — wording matters
- When factor_snapshots unavailable for this symbol: "Factor snapshots pending"

### Uncertainty
- Missing data policy: partial vs unavailable
- Data completeness score
- When no data: "Insufficient data for scoring"

### Data Gaps
- Missing features per factor group
- Fundamentals coverage status
- Explicit "not available" with reason

### Freshness
- Source from `latest_prediction_date`
- Per-table freshness (daily_prices, financial_snapshots, features, factors, predictions)
- Status: fresh (<6h), stale (6-24h), critical (>24h), unavailable

## 2. Evidence Layer

### Source
- Provider domain per data field
- Source table and field from prediction_input_lineage
- When no lineage: "Source metadata unavailable"

### Coverage
- Per-table row counts and symbol counts
- Status: available / partial / unavailable
- From /api/coverage endpoint

### Missing Data
- Explicit labeling of unavailable fields
- Reason: "Not yet scored", "Provider data incomplete", "Manually imported"
- No false green states

### Last Run
- Pipeline run timestamps from pipeline_health
- Scoring run dates from scoring_runs
- Display as relative time

### Provider Domain
- Provider lifecycle: active / archived / standby
- Domain health: healthy / degraded / unavailable
- Per-domain status from /api/ops/provider-status

## 3. Research Workflow

### Search → Inspect → Compare → Track → Audit
- Search: Global command palette (existing CommandCentre)
- Inspect: Prediction explanation modal per symbol
- Compare: Side-by-side intelligence panels
- Track: Saved research with intelligence cards
- Audit: Source/providers sheets from Trust Centre

## 4. Modal/Sheet System

### IntelligenceModal
**Purpose:** Prediction explanation — "Why this score moved"
- Trigger: "Open explanation" button on cards/rows
- Content: model output, score, confidence, factor context, data completeness, uncertainty
- Disclaimer: research only, not investment advice
- Desktop: centered modal, rounded-3xl (28px), max-w-2xl
- Mobile: bottom sheet, rounded-3xl top, full width
- Depth: shadow-depth, backdrop blur
- Accessible: focus trap, escape, click outside, aria labels

### FactorEvidenceSheet
**Purpose:** Detailed factor breakdown
- Trigger: "Factor context" link in IntelligenceModal
- Content: 6 factor scores with descriptions, trend context
- Format: grid of factor cards
- Non-causal language

### SourceAuditSheet
**Purpose:** Data lineage and provider audit
- Trigger: "Source audit" link
- Content: provider domains, freshness, availability, fallback status
- Per-domain health indicators

### DataGapSheet
**Purpose:** Explain missing data
- Trigger: "Data gaps" notice
- Content: which fields/features missing, why, what's needed
- Fundamentals coverage explanation

## 5. Visual Identity

### Institutional
- Dark-light balance with SSI ink/background tokens
- Calm, professional, not trading-floor bright
- No neon, no green/yellow dominance
- Semantic colors only for status

### AI-native
- Not "AI says" — evidence-based
- Prediction shown as data, not oracle
- Confidence, uncertainty, and gaps exposed
- Clear model boundaries

### Premium
- Rounded, tactile surfaces (rounded-2xl/3xl)
- Subtle depth (shadow-depth)
- Calm information density
- Editorial typography

### Calm
- Reduced visual noise
- Intentional whitespace
- Consistent hierarchy
- No decorative flourishes without purpose

### Distinctive
- Not another Tailwind dashboard
- Research terminal feel, not trading app
- Evidence-first, not opinion-first
- Data gaps as feature, not bug

## Component Hierarchy

```
PredictionInsightCard
├── Score (numeric + classification badge)
├── ConfidenceBar (visual + level label)
├── ModelRunBadge (model version + timestamp)
├── FactorDriverCard[] (top factors with scores)
├── DataFreshnessLine (freshness per data domain)
├── DataGapNotice (if gaps exist)
└── Button → opens IntelligenceModal

IntelligenceModal
├── Header: symbol + score + classification
├── Section: Prediction Output
│   ├── ranking_score
│   └── classification
├── Section: Confidence
│   ├── confidence_score bar
│   ├── confidence_level
│   └── UncertaintyNotice (if applicable)
├── Section: Factor Context
│   ├── FactorDriverCard[] (all 6 factors)
│   └── "Factor context, not causal attribution"
├── Section: Data Coverage
│   ├── DataFreshnessLine
│   ├── EvidenceStack
│   └── SourceTracePill[]
├── Section: Data Gaps
│   ├── DataGapNotice[]
│   └── MethodologyLink
└── Section: Disclaimers
    ├── Research only
    └── No investment advice
```
