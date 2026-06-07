# AGENT B — Feedback System

## Implementation: src/components/feedback/FeedbackWidget.tsx

### Features
- Floating button (bottom-right, z-50)
- 4 feedback types: useful, confusing, missing, incorrect
- Optional free-text comment
- Anonymous (never attributed)
- 2-second confirmation toast
- Dispatches via analytics singleton

### Integration Points
- Add <FeedbackWidget page="superpage" symbol={ticker} /> to SuperpageV8
- Add <FeedbackWidget page="compare" /> to StockCompare
- Add <FeedbackWidget page="watchlist" /> to WatchlistPage
- Add <FeedbackWidget page="journal" /> to PredictionJournalPage
- Add <FeedbackWidget page="trust" /> to TrustCentrePage

### Expected Feedback Distribution
- 40% useful (positive reinforcement)
- 25% confusing (UX improvements)
- 20% missing (feature requests)
- 15% incorrect (data quality)
