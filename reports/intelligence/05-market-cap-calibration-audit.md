# Market Cap Calibration Audit

**Generated:** 2026-06-28T17:47:14.136Z

**Total Buckets:** 4

## Bucket Configuration

| Bucket | Cap Range | Growth Range | Q-Floor | Liquidity | Weight | Status |
|--------|-----------|-------------|---------|-----------|--------|--------|
| mega | ₹5,00,000cr – ₹∞cr | 8% to 20% | undefined | 1 | undefined | active |
| large | ₹1,00,000cr – ₹5,00,000cr | 10% to 25% | undefined | 0.95 | undefined | active |
| mid | ₹20,000cr – ₹1,00,000cr | 12% to 35% | undefined | 0.85 | undefined | active |
| small | ₹0cr – ₹20,000cr | 15% to 50% | undefined | 0.7 | undefined | active |

## Test Calibrations

| Symbol | Market Cap (₹cr) | Bucket | Growth Realistic? | Liquidity Factor |
|--------|-------------------|--------|-------------------|------------------|
| RELIANCE | 20,00,000 | mega | ✅ | 1 |
| TCS | 15,00,000 | mega | ✅ | 1 |
| HDFCBANK | 12,00,000 | mega | ✅ | 1 |
| TATAMOTORS | 2,80,000 | large | ✅ | 0.95 |
| ZOMATO | 1,50,000 | large | ❌ | 0.95 |
| HAL | 2,50,000 | large | ❌ | 0.95 |

## Review Items

✅ All market cap buckets pass calibration checks.

## Weight Distribution

- **Total Weight:** NaN (should sum to ~1.0)
  - mega: NaN%
  - large: NaN%
  - mid: NaN%
  - small: NaN%