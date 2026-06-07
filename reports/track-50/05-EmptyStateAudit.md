# AGENT E — Empty State Optimisation

## Empty State Patterns (Every Empty Screen Should Teach)

### No Watchlist
Current: Shows empty state with "Add stocks to your watchlist"
Recommended: Show sample stocks (RELIANCE, TCS, INFY) with "Track companies you care about"

### No Portfolio
Current: Shows fallback positions
Recommended: "Add your holdings or create a practice portfolio. We'll analyse diversification, concentration, and risk."

### No Comparisons
Current: StockCompare shows inputs
Recommended: Show 3 preset comparisons "Popular comparisons: RELIANCE vs INFY, TCS vs INFY..."

### No History
Current: PredictionJournal shows "No predictions recorded yet"
Recommended: "Predictions are generated daily at market close. Once validation data is available, this page becomes your transparency hub."

### No Search Results
Current: implicit empty state
Recommended: "Try a different ticker (e.g., RELIANCE, TCS, INFY). Indian NSE/BSE symbols only."

## Implementation Priority
1. No watchlist — teach with presets (highest traffic empty state)
2. No history — explain the process
3. No comparisons — show popular pairs
4. No portfolio — guide to adding holdings
5. No search results — suggest common symbols
