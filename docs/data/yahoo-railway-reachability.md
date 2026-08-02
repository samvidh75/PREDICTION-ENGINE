# Yahoo Finance — Railway Reachability

**Last updated**: 2026-06-18

## Diagnosis

| Domain | Result |
|--------|--------|
| API endpoint | `query1.finance.yahoo.com/v8/finance/chart/{symbol}.NS` |
| DNS | ✅ Resolves successfully |
| Connection | ❌ HTTP 429 Too Many Requests (rate-limited / blocked) |
| Local | ❌ Blocked (429) |
| Railway | Expected to be unreachable (same geo-restrictions) |

## Status

**blocked / unreachable**

## Findings

Yahoo's v8 chart API rate-limits server-side requests from non-browser contexts. Both local development and Railway production environments are expected to receive HTTP 429 responses.

## Allowed Mitigations

| Allowed | Not Allowed |
|---------|-------------|
| Proper timeout configuration | Proxy rotation / IP cycling |
| Retry with exponential backoff | CAPTCHA bypass |
| Standard User-Agent headers | Cookie / session theft |
| Reasonable request throttling | Headless browser automation |

## Backup Strategy

| Provider | Domain | Status |
|----------|--------|--------|
| IndianAPI | Equity quotes | Active (primary) |
| jugaad-data | Bhavcopy, RBI rates, market status | Local / degraded |
| nsepython | Index quote, bhavcopy, universe | Degraded / limited |

IndianAPI remains the primary active quote provider. Yahoo is not relied upon as a critical provider.
