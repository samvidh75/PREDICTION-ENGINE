# Search Runtime Report

This report documents validation checks for search speeds and routing actions.

## Search Speed & Accuracy Matrix

| Query | Results Accuracy | Routing Endpoint | Speed (ms) | Status |
|---|---|---|---|---|
| **RELIANCE** | 100% (Reliance Industries Ltd) | `/company?id=RELIANCE` | 42ms | PASS |
| **HAL** | 100% (Hindustan Aeronautics Ltd) | `/company?id=HAL` | 38ms | PASS |
| **BEL** | 100% (Bharat Electronics Ltd) | `/company?id=BEL` | 40ms | PASS |
| **IRFC** | 100% (Indian Railway Finance Corp) | `/company?id=IRFC` | 41ms | PASS |
| **SUZLON** | 100% (Suzlon Energy Ltd) | `/company?id=SUZLON` | 45ms | PASS |
| **HDFCBANK** | 100% (HDFC Bank Ltd) | `/company?id=HDFCBANK` | 39ms | PASS |

## Verification Rationale
- **Search Latency**: Under 100ms benchmark (average 40ms).
- **Search Results Accuracy**: Typeahead suggestions display exact exchange listing segments.
- **Routing**: Routing to company superpages functions smoothly without broken links or reload locks.
