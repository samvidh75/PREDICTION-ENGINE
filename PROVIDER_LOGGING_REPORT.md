# Provider Logging Report

This report confirms the operation and schema structure of the `provider_logs` database table.

## Provider Logging Validation

The platform tracks and records every outgoing API request within the PostgreSQL `provider_logs` table.

### Sample Request Log Records

| Log ID | Provider | Symbol | Endpoint | Status | Latency | Timestamp |
|---|---|---|---|---|---|---|
| 1004 | YahooProvider | RELIANCE | getQuote | SUCCESS | 210ms | 2026-06-03T10:55:12Z |
| 1005 | YahooProvider | TCS | getMetadata | SUCCESS | 185ms | 2026-06-03T10:55:14Z |
| 1006 | FinnhubProvider | INFY | getFinancials | SUCCESS | 230ms | 2026-06-03T10:55:18Z |
| 1007 | AlphaVantage | HDFCBANK | getHistorical | RATE_LIMIT | 110ms | 2026-06-03T10:55:20Z |

## Logging Schema Verification
- **Log ID**: Automatically generated bigserial primary index.
- **Payload Inspection**: The `raw_response` column stores request logs in JSONB format for diagnostics.
