# AGENT C — User Journey Analytics

## 5 Critical Journeys

### Journey 1: Search → Superpage
- **Start**: SearchPage query
- **Path**: Search → StockStoryPage → SuperpageV8 rendering
- **Abandonment risk**: Slow API response / blank state
- **Success signal**: Superpage view > 5s with scroll depth > 50%

### Journey 2: Superpage → Watchlist
- **Start**: StockStoryPage
- **Path**: View health → Click "Add to Watchlist"
- **Abandonment risk**: User doesn't find the CTA / doesn't trust scores
- **Success signal**: watchlist_add event fires

### Journey 3: Compare Tool
- **Start**: ComparePage (page=compare)
- **Path**: Enter two symbols → Click compare → View results
- **Abandonment risk**: Loading takes > 3s / empty results
- **Success signal**: compare_performed + scroll to results

### Journey 4: Trust Centre
- **Start**: Navigation to ?page=trust
- **Path**: View metrics → Read methodology → Check calibration
- **Abandonment risk**: No data available (prediction_registry empty)
- **Success signal**: methodology_click or time_on_page > 10s

### Journey 5: Prediction Journal
- **Start**: ?page=journal
- **Path**: View predictions → Filter by symbol → Understand accuracy
- **Abandonment risk**: Empty state (no predictions yet)
- **Success signal**: symbol filter applied OR time_on_page > 8s

## Instrumentation Status
- All journeys have corresponding analytics events defined
- Feedback widget available on every page
- WelcomeExperience explains concepts before first use
