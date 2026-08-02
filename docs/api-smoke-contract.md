# StockStory India — Strict API Smoke Contract

## Purpose

This document defines the mandatory and diagnostic API smoke checks used by
`scripts/smoke-test-api.ts` to certify that a running production-style backend
satisfies its documented route contracts.

Every check in this document must be mechanically verifiable:
- exact HTTP status;
- `application/json` Content-Type;
- required JSON fields;
- custom assertions where needed.

## Required Mandatory Checks

### 2A. Liveness
- **Name**: `GET /healthz — liveness`
- **Method**: GET
- **Endpoint**: `/healthz`
- **Body**: none
- **Expected Status**: 200
- **Required Content-Type**: `application/json`
- **Required Fields**: `ok`, `service`, `at`
- **Mandatory**: yes
- **Reason**: Liveness probe; backend must respond with truthful ok=true
- **Failure message**: "Expected HTTP 200, got {status}" or "Missing required fields: {fields}"

### 2B. Readiness
- **Name**: `GET /readyz — readiness with PostgreSQL`
- **Method**: GET
- **Endpoint**: `/readyz`
- **Body**: none
- **Expected Status**: 200
- **Required Content-Type**: `application/json`
- **Required Fields**: `ok`, `database`, `migrations`
- **Custom Assertions**: `body.database.kind === "postgres"`, `body.database.fallbackUsed === false`, `body.migrations.checksumMismatch === false`
- **Mandatory**: yes
- **Reason**: Backend must be ready with PostgreSQL, no fallback, no checksum mismatch
- **Failure message**: "database.kind not postgres" or "fallbackUsed is true" or "checksum mismatch"

### 2C. Canonical StockStory fixture
- **Name**: `GET /api/stockstory/TESTIT?horizon=30`
- **Method**: GET
- **Endpoint**: `/api/stockstory/TESTIT?horizon=30`
- **Body**: none
- **Expected Status**: 200
- **Required Content-Type**: `application/json`
- **Required Fields**: `symbol`, `rankingScore`
- **Custom Assertions**: `body.symbol === "TESTIT"`, response is not HTML
- **Mandatory**: yes
- **Reason**: CI fixture must return canonical prediction
- **Failure message**: "symbol mismatch" or "not JSON"

### 2D. Unknown StockStory symbol
- **Name**: `GET /api/stockstory/UNKNOWNTEST?horizon=30`
- **Method**: GET
- **Endpoint**: `/api/stockstory/UNKNOWNTEST?horizon=30`
- **Body**: none
- **Expected Status**: 404
- **Required Content-Type**: `application/json`
- **Required Fields**: `code`
- **Custom Assertions**: `body.code === "SYMBOL_NOT_IN_UNIVERSE"`
- **Mandatory**: yes
- **Reason**: Unknown symbols must return documented 404, not fallback data
- **Failure message**: "expected 404 for unknown symbol" or "wrong error code"

### 2E. Prediction signals
- **Name**: `GET /api/predictions/signals?limit=5`
- **Method**: GET
- **Endpoint**: `/api/predictions/signals?limit=5`
- **Body**: none
- **Expected Status**: 200
- **Required Content-Type**: `application/json`
- **Required Fields**: `signals`, `generatedAt`
- **Mandatory**: yes
- **Reason**: Must return signal feed with generatedAt timestamp
- **Failure message**: "missing required fields"

### 2F. Prediction explanation
- **Name**: `GET /api/predictions/explain/TESTIT`
- **Method**: GET
- **Endpoint**: `/api/predictions/explain/TESTIT`
- **Body**: none
- **Expected Status**: 200
- **Required Content-Type**: `application/json`
- **Required Fields**: `symbol`
- **Custom Assertions**: `body.symbol === "TESTIT"`
- **Mandatory**: yes
- **Reason**: Explanation endpoint is production-contract; must work for CI fixture
- **Failure message**: "symbol mismatch"

### 2G. Company intelligence
- **Name**: `GET /api/intelligence/company/TESTIT`
- **Method**: GET
- **Endpoint**: `/api/intelligence/company/TESTIT`
- **Body**: none
- **Expected Status**: 200
- **Required Content-Type**: `application/json`
- **Required Fields**: `symbol`
- **Custom Assertions**: `body.symbol === "TESTIT"` or inside canonical envelope; response must indicate real/partial/unavailable/error
- **Mandatory**: yes
- **Reason**: Company intelligence must return honest state for CI fixture
- **Failure message**: "symbol mismatch or envelope missing"

### 2H. Empty portfolio intelligence (POST)
- **Name**: `POST /api/intelligence/portfolio (empty)`
- **Method**: POST
- **Endpoint**: `/api/intelligence/portfolio`
- **Body**: `{"positions": []}`
- **Headers**: `Content-Type: application/json`, `Accept: application/json`
- **Expected Status**: 200
- **Required Content-Type**: `application/json`
- **Required Fields**: none (empty-position envelope)
- **Custom Assertions**: response must not contain demo/synthetic holdings; must be honest empty-response
- **Mandatory**: yes
- **Reason**: Empty portfolio POST must return honest empty response, not fabricated data
- **Failure message**: "empty portfolio returned fabricated positions"

### 2I. Missing-token user profile
- **Name**: `GET /api/user/profile (no auth)`
- **Method**: GET
- **Endpoint**: `/api/user/profile`
- **Body**: none
- **Expected Status**: 401
- **Required Content-Type**: `application/json`
- **Required Fields**: `code`
- **Custom Assertions**: `body.code === "AUTH_MISSING"`
- **Mandatory**: yes
- **Reason**: Protected route must reject missing Authorization header
- **Failure message**: "expected 401 AUTH_MISSING"

### 2J. Missing-token investor state
- **Name**: `GET /api/investor-state (no auth)`
- **Method**: GET
- **Endpoint**: `/api/investor-state`
- **Body**: none
- **Expected Status**: 401
- **Required Content-Type**: `application/json`
- **Required Fields**: `code`
- **Custom Assertions**: `body.code === "AUTH_MISSING"`
- **Mandatory**: yes
- **Reason**: Protected route must reject missing Authorization header
- **Failure message**: "expected 401 AUTH_MISSING"

### 2K. Missing-token watchlists
- **Name**: `GET /api/watchlists (no auth)`
- **Method**: GET
- **Endpoint**: `/api/watchlists`
- **Body**: none
- **Expected Status**: 401
- **Required Content-Type**: `application/json`
- **Required Fields**: `code`
- **Custom Assertions**: `body.code === "AUTH_MISSING"`
- **Mandatory**: yes
- **Reason**: Protected route must reject missing Authorization header
- **Failure message**: "expected 401 AUTH_MISSING"

### 2L. Invalid method handling
- **Name**: `POST /healthz — invalid method`
- **Method**: POST
- **Endpoint**: `/healthz`
- **Body**: none
- **Expected Status**: 404 or 405
- **Required Content-Type**: `application/json` (if Fastify formats errors as JSON)
- **Mandatory**: yes
- **Reason**: Invalid HTTP method must not return 200
- **Failure message**: "expected 404/405, got 200"

### 2M. Malformed JSON handling
- **Name**: `POST /api/intelligence/portfolio — malformed JSON`
- **Method**: POST
- **Endpoint**: `/api/intelligence/portfolio`
- **Body**: `{not-valid-json`
- **Headers**: `Content-Type: application/json`
- **Expected Status**: 400
- **Required Content-Type**: `application/json`
- **Mandatory**: yes
- **Reason**: Malformed request body must return 400, not crash server
- **Failure message**: "expected 400 for malformed JSON"

## Diagnostic Checks

### 2L. Public plans
- **Name**: `GET /api/plans`
- **Method**: GET
- **Endpoint**: `/api/plans`
- **Body**: none
- **Expected Status**: 200
- **Required Content-Type**: `application/json`
- **Mandatory**: diagnostic
- **Reason**: Public plans endpoint should remain reachable without auth; exists in retention routes

## Report Output

The smoke test writes a machine-readable JSON report to `reports/release/api-smoke-report.json` (overridable via `SMOKE_REPORT_PATH`), containing:

```json
{
  "generatedAt": "ISO 8601 timestamp",
  "baseUrl": "http://...",
  "summary": {
    "total": 14,
    "passed": 13,
    "failed": 1,
    "mandatoryFailed": 0,
    "diagnosticFailed": 1
  },
  "checks": [
    {
      "name": "...",
      "method": "GET",
      "endpoint": "/...",
      "mandatory": true,
      "expectedStatus": 200,
      "actualStatus": 200,
      "contentType": "application/json",
      "passed": true,
      "durationMs": 15,
      "error": null
    }
  ]
}
