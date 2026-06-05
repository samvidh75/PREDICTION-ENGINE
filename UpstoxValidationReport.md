# TRACK-8D Live Upstox Validation Report

Date: 2026-06-06

Run ID: `2026-06-05T18-44-23-539Z`

Scope:
- Provider validated: `src/services/providers/UpstoxFundamentalsProvider.ts`
- Coordinator checked: `src/services/providers/ProviderCoordinator.ts`
- Symbols validated: `RELIANCE`, `TCS`, `INFY`, `HDFCBANK`, `ICICIBANK`
- Raw payload directory: `reports/track-8d/upstox-live-rerun/2026-06-05T18-44-23-539Z/raw`
- Latest payload mirror: `reports/track-8d/upstox-live-latest/raw`

## Endpoints Actually Used By Provider

`UpstoxFundamentalsProvider` calls exactly these live Upstox endpoints:

1. `GET https://api.upstox.com/v2/fundamentals/{isin}/key-ratios`
2. `GET https://api.upstox.com/v2/fundamentals/{isin}/balance-sheet?type=consolidated`

Auth mode:
- `Authorization: Bearer <Upstox OAuth access token>`
- Token value is intentionally not printed in this report or saved in payloads.

## HTTP Status Results

| Symbol | ISIN | key-ratios status | balance-sheet status | Unsupported route? | Auth failure? |
|---|---|---:|---:|---:|---:|
| RELIANCE | INE002A01018 | 200 | 200 | No | No |
| TCS | INE467B01029 | 200 | 200 | No | No |
| INFY | INE009A01021 | 200 | 200 | No | No |
| HDFCBANK | INE040A01034 | 200 | 200 | No | No |
| ICICIBANK | INE090A01021 | 200 | 200 | No | No |

## Mapped Field Count

19 live-fundamental fields counted:

`peRatio`, `pbRatio`, `evEbitda`, `roe`, `roic`, `roa`, `totalAssets`, `totalLiabilities`, `totalEquity`, `debtToEquity`, `periodEnd`, `totalAssetCrore`, `totalLiabilityCrore`, `historyRows`, `keyRatioRows`, `sectorPe`, `sectorPb`, `sectorRoe`, `sectorRoce`.

| Symbol | Populated live fields | Required threshold | Result |
|---|---:|---:|---|
| RELIANCE | 19/19 | 10/19 | PASS |
| TCS | 19/19 | 10/19 | PASS |
| INFY | 19/19 | 10/19 | PASS |
| HDFCBANK | 16/19 | 10/19 | PASS |
| ICICIBANK | 16/19 | 10/19 | PASS |

Bank symbols did not populate `evEbitda`, `roic`, and `sectorRoce` from the returned ratio set. They still exceed the success threshold.

## Raw Payload Attachments

Raw HTTP responses:

- `reports/track-8d/upstox-live-rerun/2026-06-05T18-44-23-539Z/raw/RELIANCE-key-ratios.json`
- `reports/track-8d/upstox-live-rerun/2026-06-05T18-44-23-539Z/raw/RELIANCE-balance-sheet.json`
- `reports/track-8d/upstox-live-rerun/2026-06-05T18-44-23-539Z/raw/TCS-key-ratios.json`
- `reports/track-8d/upstox-live-rerun/2026-06-05T18-44-23-539Z/raw/TCS-balance-sheet.json`
- `reports/track-8d/upstox-live-rerun/2026-06-05T18-44-23-539Z/raw/INFY-key-ratios.json`
- `reports/track-8d/upstox-live-rerun/2026-06-05T18-44-23-539Z/raw/INFY-balance-sheet.json`
- `reports/track-8d/upstox-live-rerun/2026-06-05T18-44-23-539Z/raw/HDFCBANK-key-ratios.json`
- `reports/track-8d/upstox-live-rerun/2026-06-05T18-44-23-539Z/raw/HDFCBANK-balance-sheet.json`
- `reports/track-8d/upstox-live-rerun/2026-06-05T18-44-23-539Z/raw/ICICIBANK-key-ratios.json`
- `reports/track-8d/upstox-live-rerun/2026-06-05T18-44-23-539Z/raw/ICICIBANK-balance-sheet.json`

Mapped field diagnostics:

- `reports/track-8d/upstox-live-rerun/2026-06-05T18-44-23-539Z/raw/RELIANCE-live-field-map.json`
- `reports/track-8d/upstox-live-rerun/2026-06-05T18-44-23-539Z/raw/TCS-live-field-map.json`
- `reports/track-8d/upstox-live-rerun/2026-06-05T18-44-23-539Z/raw/INFY-live-field-map.json`
- `reports/track-8d/upstox-live-rerun/2026-06-05T18-44-23-539Z/raw/HDFCBANK-live-field-map.json`
- `reports/track-8d/upstox-live-rerun/2026-06-05T18-44-23-539Z/raw/ICICIBANK-live-field-map.json`

Summary:

- `reports/track-8d/upstox-live-rerun/2026-06-05T18-44-23-539Z/live-field-summary.json`
- `reports/track-8d/upstox-live-latest/live-field-summary.json`

## Provider Decision

`UpstoxFundamentalsProvider` remains enabled in `ProviderCoordinator`.

Reason:
- All implemented endpoints returned HTTP 200.
- No endpoint returned `404`.
- No unsupported-route response was observed.
- All five symbols exceeded the 10/19 live field threshold.

## No Mocked Or Synthetic Values

The validation counted only fields mapped from the live Upstox endpoint payloads.

`UpstoxFundamentalsProvider` does not count registry `marketCap` as Upstox fundamentals.

## Code Status

Already enabled:
- Browser token source: `localStorage.getItem('upstox_access_token')`
- Server/script token source: `process.env.UPSTOX_ACCESS_TOKEN` or `process.env.VITE_UPSTOX_ACCESS_TOKEN`

Already fixed:
- `ProviderCoordinator` imports the market-data Upstox provider from `./UpstoxProvider`.
- `UpstoxFundamentalsProvider` does not inject registry market cap into live fundamentals.

## Final Status

TRACK-8D result: PASS

Provider removal required: No.
