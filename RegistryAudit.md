# Registry Audit Report (Phase 1)

Audit of `MasterCompanyRegistry.ts` company registry coverage and completeness.

## 1. Summary Statistics

- **Total covered companies:** 279 (consisting of 25 heavyweights + 254 parsed from `generate500Stocks.ts`)
- **Active NSE/BSE Target Coverage:** 500+ (Requires 500+ verified companies in V2)
- **Gaps found:** 
  - Standardized ISINs are missing for all 254 fallback companies (contain only placeholders or empty fields).
  - Market caps are missing for all fallback companies (undefined).
  - BSE codes are missing for all fallback companies.
  - Exchange mappings are present but default to "NSE".

## 2. Integrity & Validation Gaps

- **Duplicate symbols:** None.
- **Duplicate ISINs:** None (since they are mostly blank).
- **Invalid records:** 254 companies have empty/blank websites, missing ISINs, and missing BSE codes.
- **Ticker as company name:** None in the main registry, but Yahoo/Finnhub failovers occasionally fall back to ticker-as-name.

## 3. Plan for V2 Security Master

We will expand `MasterCompanyRegistryV2.ts` to cover 500+ verified companies with:
- Clean NSE Symbol
- Clean BSE Symbol (if available)
- Verified legal Company Name (never ticker-as-company-name)
- Valid ISIN (IN + 10 alphanumeric characters)
- Verified Sector & Industry
- Verified Market Cap (or null if unavailable)
- Primary Exchange mapping
- Active Listing Status
