# nselib Provider

**Status**: Unavailable on current infrastructure
**Python required**: 3.10+ (PEP 604 union syntax)
**Python available**: 3.9.6 (both local and Railway)
**Credentials**: None required

## Probe Result (2026-06-18)

nselib cannot be imported on Python 3.9 due to:

```
TypeError: unsupported operand type(s) for |: 'type' and 'NoneType'
```

The `|` (union) operator in type hints was introduced in Python 3.10.
nselib uses `pd.Timestamp | None` syntax which is incompatible with 3.9.

## What nselib Would Provide

If Python were upgraded to 3.10+, nselib would provide:

| Domain | Function | Status |
|--------|----------|--------|
| Equity list | `capital_market.equity_list()` | Healthy (on 3.10+) |
| Nifty 50 constituents | `indices.nifty_indices_constituents()` | Healthy |
| Index data | `indices.index_data()` | Healthy |
| Price-volume | `capital_market.price_volume_data()` | Healthy |
| Deliverable data | `capital_market.price_volume_and_deliverable_position_data()` | Healthy |
| Bhavcopy | `capital_market.bhav_copy_equities()` | Healthy |
| Bhavcopy with delivery | `capital_market.bhav_copy_with_delivery()` | Healthy |
| Corporate actions | `capital_market.corporate_actions_for_equity()` | Healthy |
| Event calendar | `capital_market.event_calendar_for_equity()` | Healthy |
| Financial results | `capital_market.financial_results_for_equity()` | Healthy |
| F&O derivatives | `derivatives.derivatives_data()` | Healthy |

## Railway Deployment

nselib requires Python 3.10+. If Railway runs Python 3.9, nselib is unavailable.
Upgrade Railway runtime to Python 3.10+ to enable nselib.

## Workaround

Upgrade Railway runtime to Python 3.10+ (from current 3.9).

## Recommendation

Consider upgrading the Railway runtime to Python 3.10+ to enable nselib.
Until then:
- **jugaad-data** provides bhavcopy CSV, RBI rates, market status, index data
- **nsepython** provides limited NSE data (index quotes, universe list)
