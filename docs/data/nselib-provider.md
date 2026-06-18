# nselib Provider

**Status**: Partially available on Railway; unavailable locally
**Python required**: 3.10+ (PEP 604 union syntax)
**Python available**: 3.9.6 (local), 3.12 (Railway via Dockerfile)
**Credentials**: None required

## Probe Result (2026-06-18)

nselib cannot be imported on Python 3.9 due to:

```
TypeError: unsupported operand type(s) for |: 'type' and 'NoneType'
```

The `|` (union) operator in type hints was introduced in Python 3.10.
nselib uses `pd.Timestamp | None` syntax which is incompatible with 3.9.

## What nselib Provides

The Dockerfile now installs Python 3.12 on Alpine 3.21, making nselib importable on Railway. Probe results on Railway (Python 3.12):

| Domain | Function | Status |
|--------|----------|--------|
| Equity list | `capital_market.equity_list()` | Healthy |
| Nifty 50 constituents | `indices.nifty_indices_constituents()` | Healthy |
| Index data | `indices.index_data()` | Healthy |
| Bhavcopy | `capital_market.bhav_copy_equities()` | Healthy |
| Bhavcopy with delivery | `capital_market.bhav_copy_with_delivery()` | Healthy |
| Price-volume | `capital_market.price_volume_data()` | NSE blocks server-side |
| Deliverable data | `capital_market.price_volume_and_deliverable_position_data()` | NSE blocks server-side |
| Corporate actions | `capital_market.corporate_actions_for_equity()` | NSE blocks server-side |
| Event calendar | `capital_market.event_calendar_for_equity()` | NSE blocks server-side |
| Financial results | `capital_market.financial_results_for_equity()` | NSE blocks server-side |
| F&O derivatives | `derivatives.derivatives_data()` | NSE blocks server-side |

## Railway Deployment

The Dockerfile (`node:22-alpine` → `apk add python3`) provides Python 3.12. nselib is importable. However, NSE blocks server-side equity-specific endpoints regardless of Python version. Only bhavcopy and index data work.

## Local Development

Local Python remains at 3.9.6 (macOS system Python). nselib unavailable locally unless Python 3.10+ is installed separately.

## Recommendation

nselib is now usable on Railway for **bhavcopy** and **index data** — a step forward. Each provider adapter that calls nselib handles import failure gracefully. Add nselib to the active fallback chain for bhavcopy (after jugaad-data) and index data (primary).

For local testing with nselib, install Python 3.10+ via pyenv or Homebrew:
```bash
brew install python@3.12
pip3 install -r requirements-nse.txt
```
