# Real Search Coverage Report

This report confirms that the search index has been rebuilt and covers only real Indian listed companies.

## Search Validation Results
- **Total Indexed Securities**: 505
- **Synthetic Candidates Found**: 0 (all purged)
- **Real Candidate Matches**: 100% (e.g. `ADANIPOWER`, `BAJAJFINSV`, `SBIN`, `TCS`, `INFY` etc.)

## Sample Search Logs

| Search Term | Autocomplete Suggestions | Real / Synthetic | Navigation Outcome |
|---|---|---|---|
| `ADANI` | Adani Enterprises, Adani Power, Adani Green | **REAL** | Routes to `/company?id=ADANIPOWER` |
| `TATA` | Tata Steel, Tata Power, TCS | **REAL** | Routes to `/company?id=TCS` |
| `SUZLON` | Suzlon Energy Limited | **REAL** | Routes to `/company?id=SUZLON` |
| `ADANIPOWER_1`| No results found | **N/A** | Suggestion blocked (purged) |
