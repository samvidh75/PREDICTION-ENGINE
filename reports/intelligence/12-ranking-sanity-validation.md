# Ranking Sanity Validation Report

**Generated:** 2026-06-28T17:49:46.365Z

**Rankings Tested:** 25

## Top 25 Rankings

| Rank | Symbol | Quality | Risk | Momentum | Confidence | D/E | Issues |
|------|--------|---------|------|----------|------------|-----|--------|
| 1 | TCS | 0.92 | 0.18 | 0.55 | 0.85 | 0.05 | ✅ |
| 2 | HDFCBANK | 0.88 | 0.22 | 0.48 | 0.82 | 0.10 | ✅ |
| 3 | HINDUNILVR | 0.90 | 0.15 | 0.40 | 0.88 | 0.00 | ✅ |
| 4 | RELIANCE | 0.82 | 0.30 | 0.62 | 0.78 | 0.80 | ✅ |
| 5 | INFY | 0.85 | 0.25 | 0.58 | 0.80 | 0.02 | ✅ |
| 6 | BHARTIARTL | 0.75 | 0.40 | 0.68 | 0.72 | 1.80 | ✅ |
| 7 | KOTAKBANK | 0.86 | 0.20 | 0.52 | 0.84 | 0.08 | ✅ |
| 8 | TITAN | 0.78 | 0.28 | 0.55 | 0.76 | 0.35 | ✅ |
| 9 | ASIANPAINT | 0.89 | 0.18 | 0.35 | 0.86 | 0.02 | ✅ |
| 10 | ADANIENT | 0.55 | 0.85 | 0.72 | 0.25 | 2.50 | ⚠️ severe_risk_top, low_confidence_top, high_debt_leader, missing_data_conviction |
| 11 | NESTLEIND | 0.91 | 0.12 | 0.22 | 0.82 | 0.00 | ⚠️ value_trap_quality |
| 12 | MARUTI | 0.80 | 0.32 | 0.56 | 0.74 | 0.10 | ✅ |
| 13 | JSWSTEEL | 0.60 | 0.65 | 0.58 | 0.55 | 2.80 | ⚠️ high_debt_leader |
| 14 | SBIN | 0.72 | 0.35 | 0.50 | 0.70 | 0.12 | ✅ |
| 15 | SUNPHARMA | 0.77 | 0.28 | 0.54 | 0.75 | 0.20 | ✅ |
| 16 | COALINDIA | 0.68 | 0.25 | 0.30 | 0.65 | 0.00 | ✅ |
| 17 | NTPC | 0.70 | 0.22 | 0.45 | 0.68 | 1.20 | ✅ |
| 18 | HAL | 0.65 | 0.38 | 0.72 | 0.62 | 0.00 | ✅ |
| 19 | ADANIGREEN | 0.45 | 0.70 | 0.75 | 0.30 | 4.00 | ⚠️ high_debt_leader, missing_data_conviction |
| 20 | TATAMOTORS | 0.62 | 0.55 | 0.52 | 0.58 | 1.80 | ✅ |
| 21 | ZOMATO | 0.50 | 0.55 | 0.68 | 0.22 | 0.10 | ✅ |
| 22 | TATASTEEL | 0.55 | 0.60 | 0.42 | 0.55 | 1.50 | ✅ |
| 23 | BEL | 0.60 | 0.30 | 0.65 | 0.60 | 0.00 | ✅ |
| 24 | TRENT | 0.72 | 0.35 | 0.60 | 0.68 | 0.30 | ✅ |
| 25 | DABUR | 0.74 | 0.20 | 0.38 | 0.72 | 0.05 | ✅ |

## Flagged Issues

**Total issues:** 8

### severe_risk_top (1)

- **ADANIENT** (Rank #10): Rank #10 with risk score 0.85 — high risk in top 10 is suspicious

### low_confidence_top (1)

- **ADANIENT** (Rank #10): Rank #10 with confidence 0.25 — shouldn't rank this high with low confidence

### high_debt_leader (3)

- **ADANIENT** (Rank #10): D/E ratio 2.5 at rank #10 — high debt in top rankings needs justification
- **JSWSTEEL** (Rank #13): D/E ratio 2.8 at rank #13 — high debt in top rankings needs justification
- **ADANIGREEN** (Rank #19): D/E ratio 4 at rank #19 — high debt in top rankings needs justification

### missing_data_conviction (2)

- **ADANIENT** (Rank #10): Conviction 0.85 with low confidence 0.25 at rank #10
- **ADANIGREEN** (Rank #19): Conviction 0.8 with low confidence 0.3 at rank #19

### value_trap_quality (1)

- **NESTLEIND** (Rank #11): Quality 0.91 but momentum 0.22 — possible value trap at rank #11

## Sanity Check Coverage

| Check | Description | Triggered |
|-------|-------------|-----------|
| severe_risk_top | High risk (>.7) in top 10 | 1 |
| low_confidence_top | Low confidence (<.3) in top 15 | 1 |
| value_trap_quality | High quality + low momentum in top 20 | 1 |
| high_debt_leader | D/E > 2.0 in top 20 | 3 |
| missing_data_conviction | High conviction + low confidence | 2 |
| dividend_trap_stability | Yield >5% in stability top 15 | 0 |