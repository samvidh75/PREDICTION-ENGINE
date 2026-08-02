# Provider Authorizations

Each external data provider integrated into the prediction engine must be
explicitly authorized before automated ingestion may begin. This layer enforces
a consistent authorization gate across all providers and prevents accidental
ingestion from unapproved sources.

---

## How Authorization Metadata Is Recorded

Authorization metadata is stored **outside the repository**—in environment
variables or a secrets manager—and loaded at startup by
`ProviderAuthorization.ts`. The following metadata is tracked for each
provider:

| Field                   | Env Variable Pattern                                    | Purpose                                              |
| ----------------------- | ------------------------------------------------------- | ---------------------------------------------------- |
| Ingestion enabled       | `{PROVIDER}_INGESTION_ENABLED`                          | Kill-switch to disable the provider                  |
| Authorization record ID | `{PROVIDER}_AUTHORIZATION_RECORD_ID`                    | Reference to the legal / business authorization      |
| Authorization scope     | `{PROVIDER}_AUTHORIZATION_SCOPE`                        | Permissions granted (see below)                      |
| Requests per minute     | `{PROVIDER}_REQUESTS_PER_MINUTE`                        | Rate-limit ceiling (default: `6`)                    |
| Requests per day        | `{PROVIDER}_REQUESTS_PER_DAY`                           | Daily budget ceiling (default: `500`)                |
| Concurrency limit       | `{PROVIDER}_CONCURRENCY_LIMIT`                          | Max concurrent connections (default: `1`)            |
| User agent              | `{PROVIDER}_USER_AGENT`                                 | HTTP `User-Agent` header value                       |
| Contact email           | `AUTHORIZED_PROVIDER_CONTACT_EMAIL`                     | Fallback contact for User-Agent (shared across all)  |

Authorization record IDs refer to entries in a separate authorization tracking
system (e.g., compliance spreadsheets, legal case management, or a contracts
database). The record ID itself is opaque and **must not contain confidential
contract terms**.

Contractual agreements, legal review documents, and licensing terms must be
stored in the appropriate compliance system—never in this repository.

---

## Permissions Required

Each provider's `{PROVIDER}_AUTHORIZATION_SCOPE` value must be a string that
matches one or more of the following classes:

| Scope                            | Meaning                                                   |
| -------------------------------- | --------------------------------------------------------- |
| `AUTHORIZED_AUTOMATED_INGESTION` | Automated bulk data retrieval is permitted                |
| `AUTHORIZED_STORAGE_AND_DERIVATION` | Storing provider data and deriving derived metrics    |
| `AUTHORIZED_PUBLIC_DISPLAY`      | Displaying provider-sourced data to end users             |
| `AUTHORIZED_INTERNAL_ONLY`       | Data may only be used for internal analytics              |

`isPublicDisplayAllowed()` checks explicitly for `public_display` or
`PUBLIC_DISPLAY` within the scope string. Any provider whose scope does not
include a public display token is treated as internal-only.

---

## How To Enable Each Provider

### 1. Obtain Authorization

Before enabling any provider, confirm that a written authorization, license
agreement, or documented terms of service permit automated ingestion. Record
the authorization in your compliance system and obtain a unique record ID.

### 2. Set Environment Variables

For each provider, set the following environment variables:

```bash
# Example: enabling Screener.in
SCREENER_INGESTION_ENABLED=true
SCREENER_AUTHORIZATION_RECORD_ID=auth-rec-2025-0042
SCREENER_AUTHORIZATION_SCOPE=AUTHORIZED_AUTOMATED_INGESTION AUTHORIZED_INTERNAL_ONLY
SCREENER_REQUESTS_PER_MINUTE=10
SCREENER_REQUESTS_PER_DAY=1000
SCREENER_CONCURRENCY_LIMIT=2
SCREENER_USER_AGENT=StockStory/1.0 (ops@example.com)

# Optional global contact email (used as fallback in User-Agent)
AUTHORIZED_PROVIDER_CONTACT_EMAIL=ops@example.com
```

### 3. Verify the Gate

Run the authorization gate check programmatically:

```ts
import { loadAuthorizedProviderConfig, authorizeProviderIngestion } from './services/providers/authorization/ProviderAuthorization';

const config = loadAuthorizedProviderConfig();
const result = authorizeProviderIngestion('screener', config.screener);

if (!result.passed) {
  console.error(`Gate rejected: ${result.reason}`);
  process.exit(1);
}
```

The gate will fail with a clear reason if any required field is missing or
invalid.

---

## Kill-Switch Behavior

Setting `{PROVIDER}_INGESTION_ENABLED=false` (or omitting it) **immediately
disables** the provider at the authorization gate. The gate returns:

```json
{
  "passed": false,
  "authorizationClass": "DISABLED",
  "reason": "screener: ingestion is disabled (set SCREENER_INGESTION_ENABLED=true)"
}
```

No outbound requests are made when the gate has not passed. This kill-switch
operates at configuration-load time and does not require a code deployment.

---

## Authorization Scope Review Requirements

Before enabling any provider in **production**, the following must review and
approve the `{PROVIDER}_AUTHORIZATION_SCOPE` value:

| Role                        | Responsibility                                           |
| --------------------------- | -------------------------------------------------------- |
| **Engineering lead**        | Confirms the provider adapter code aligns with scope     |
| **Compliance / Legal**      | Confirms the scope matches the signed agreement or ToS   |
| **Operations / Security**   | Confirms rate limits, concurrency, and user-agent values |

At least two of the three roles must sign off before the provider is enabled in
a production environment. Development and staging environments may use
restricted scopes (e.g., `AUTHORIZED_INTERNAL_ONLY`) without full review.

---

## Environment Variables Reference

### Per-Provider Variables

| Variable                                         | Default  | Required | Description                                     |
| ------------------------------------------------ | -------- | -------- | ----------------------------------------------- |
| `SCREENER_INGESTION_ENABLED`                     | `false`  | No       | Kill-switch for Screener.in ingestion           |
| `SCREENER_AUTHORIZATION_RECORD_ID`               | `""`     | Yes*     | Authorization record identifier                 |
| `SCREENER_AUTHORIZATION_SCOPE`                   | `""`     | Yes*     | Permission scope string                         |
| `SCREENER_REQUESTS_PER_MINUTE`                   | `6`      | No       | Max requests per minute                         |
| `SCREENER_REQUESTS_PER_DAY`                      | `500`    | No       | Max requests per day                            |
| `SCREENER_CONCURRENCY_LIMIT`                     | `1`      | No       | Max concurrent requests                         |
| `SCREENER_USER_AGENT`                            | `""`     | Yes*     | HTTP User-Agent string                          |
| `MONEYCONTROL_INGESTION_ENABLED`                 | `false`  | No       | Kill-switch for Moneycontrol ingestion          |
| `MONEYCONTROL_AUTHORIZATION_RECORD_ID`           | `""`     | Yes*     | Authorization record identifier                 |
| `MONEYCONTROL_AUTHORIZATION_SCOPE`               | `""`     | Yes*     | Permission scope string                         |
| `MONEYCONTROL_REQUESTS_PER_MINUTE`               | `6`      | No       | Max requests per minute                         |
| `MONEYCONTROL_REQUESTS_PER_DAY`                  | `500`    | No       | Max requests per day                            |
| `MONEYCONTROL_CONCURRENCY_LIMIT`                 | `1`      | No       | Max concurrent requests                         |
| `MONEYCONTROL_USER_AGENT`                        | `""`     | Yes*     | HTTP User-Agent string                          |

\* Required only when `{PROVIDER}_INGESTION_ENABLED=true`.

### Global Variables

| Variable                              | Default  | Required | Description                                      |
| ------------------------------------- | -------- | -------- | ------------------------------------------------ |
| `AUTHORIZED_PROVIDER_CONTACT_EMAIL`   | `""`     | No       | Fallback contact for User-Agent when not set per-provider |

---

## Security Notes

- **Never commit** authorization record IDs, API keys, tokens, or contractual
  terms to the repository.
- Authorization error messages **must not** include the raw record ID or any
  other confidential value. The authorization gate only reports that a value
  is "missing or too short"—never the actual value.
- Use a secrets manager (e.g., AWS Secrets Manager, Vault, Doppler) in
  production instead of plain-text environment files where possible.
