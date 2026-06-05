# Survivorship Bias Report — Institutional Backtesting

**Generated:** 2026-06-05T10:24:58.341Z

---

## Survivorship Assessment

| Category | Count | Impact |
|:---------|:------|:-------|
| **Failed to fetch** (possibly delisted/merged/symbol changed) | 17 | These companies likely delisted, merged, or have invalid symbols |
| **Limited history** (< 60 data points) | 0 | Recently listed or thinly traded — partial coverage |
| **Full history** (≥ 60 data points) | 233 | Full coverage |
| **Universe total** | 250 | — |

---

## Detailed Failures (Companies lacking price data)

| Symbol | Name | Sector | Reason |
|:-------|:-----|:-------|:-------|
| M_M | Mahindra & Mahindra Limited | Automotive | Yahoo API returned no data |
| HPCL | Hindustan Petroleum Corporation Limited | Energy & Oil | Only 0 points |
| GMRINFRA | GMR Airports Infrastructure Limited | Infrastructure | Yahoo API returned no data |
| IDFC | IDFC Limited | Banking & Finance | Yahoo API returned no data |
| PIDILITE | Pidilite Industries Limited | Chemicals | Yahoo API returned no data |
| TATAMOTORS | Tata Motors Ltd | Automobile | Yahoo API returned no data |
| TV18BRDCST | TV18 Broadcast Limited | Consumer Goods | Yahoo API returned no data |
| APARIND | Apar Industries Limited | Consumer Goods | Yahoo API returned no data |
| BAJAJ_AUTO | Bajaj Auto Limited | Automotive | Yahoo API returned no data |
| BERGERPAINT | Berger Paints India Limited | Consumer Goods | Yahoo API returned no data |
| BIRLASOFT | Birlasoft Limited | Information Technology | Yahoo API returned no data |
| IBULHSGFIN | Indiabulls Housing Finance Limited | Banking & Finance | Yahoo API returned no data |
| INFIBEAM | Infibeam Avenues Limited | Information Technology | Yahoo API returned no data |
| L_TFH | L&T Finance Holdings Limited | Banking & Finance | Yahoo API returned no data |
| LTIM | LTIMindtree Limited | Information Technology | Yahoo API returned no data |
| MCDOWELL_N | United Spirits Limited | Consumer Goods | Yahoo API returned no data |
| PRICOL | Pricol Limited | Automotive | Only 0 points |

---

## Survivorship Bias Analysis

### What This Means

All companies in our universe are **currently listed and actively traded on NSE/BSE**. This means:

1. **Companies that delisted before today are excluded** → upward bias in returns
2. **Companies that merged (acquired) are excluded** → merger premium not captured
3. **Bankrupt companies are excluded** → survivorship boosts apparent model performance
4. **Failed symbol lookups (17)** may represent delisted names

### Mitigation

| Bias | Severity | Mitigation |
|:-----|:---------|:-----------|
| Survivorship (delisted missing) | ⚠️ Medium | Backward-looking 2Y window partially mitigates — companies that existed 2Y ago but delisted since are included in 24M snapshots |
| Look-ahead (future info) | ✅ None | All snapshots use only data available at that time |
| Selection bias (top market cap) | ⚠️ Low | Registry includes broad cross-section, not just large caps |
| Backfill gaps (thin history) | ⚠️ Low | 0 companies have < 60 trading days |

### Verdict

**Survivorship bias exists but is partially mitigated** by the 2-year lookback window. Companies present at the snapshot date are included regardless of subsequent status. The primary gap is pre-2024 delistings, which would require historical constituent lists.

