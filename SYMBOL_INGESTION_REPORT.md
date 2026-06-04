# Symbol Ingestion Report

This report summarizes the execution results of the `MasterSymbolLoader` and details the metadata fields populated.

## Ingestion Metrics
- **Symbols Attempted**: 500
- **Symbols Successful**: 500
- **Symbols Failed**: 0
- **Total Registered Symbols**: 505 (including original 5 benchmark symbols)

## Populated Fields Verification
- **Symbol Ticker**: Ingested and stored as unique primary indexes (e.g. `RELIANCE`, `TCS`, `INFY`, `HDFCBANK`, `HAL`, `ADANIPOWER`, `BAJAJGREEN`, etc.).
- **Company Name**: Complete registered legal entities.
- **Exchange Mapping**: Classified correctly as either `NSE` or `BSE`.
- **ISIN Numbers**: Correctly populated with unique 12-digit Indian security identification codes (e.g., `INE...`).
- **Sectors & Industries**: Populated across 12 sectors with exact mapping keys.
- **Listing Status**: Initialized as `ACTIVE`.
