# AGENT K — 90-Day Roadmap

## Month 1: Trust & Data Quality (Days 1-30)
### Priority 1: Prediction data pipeline
- Automated daily prediction generation
- Automated validation after horizon passes
- Trust Centre shows real hit rates (not "Insufficient data")
- **Success metric**: 100+ validated predictions in journal

### Priority 2: Data population automation
- Cron-based daily NSE/BSE price ingestion
- Automated quarterly financial data refresh
- Daily factor recalculation pipeline
- **Success metric**: Data freshness < 24 hours for all symbols

### Priority 3: Beta user onboarding
- Recruit 25-50 beta users (finance enthusiasts, analysts)
- Collect structured feedback per journey
- Measure time-to-understand (target: < 60s via WelcomeExperience)
- **Success metric**: 80%+ "useful" feedback ratio

## Month 2: Retention & Scaling (Days 31-60)
### Priority 4: PostgreSQL migration
- Migrate from SQLite to PostgreSQL
- Add connection pooling
- Add Redis for API cache (replace in-memory)

### Priority 5: Universe expansion
- Nifty 100 → Nifty 500
- Add BSE Midcap/Smallcap indices
- Expand sector coverage

### Priority 6: Watchlist intelligence refinement
- Daily delta alerts (currently just visual)
- Push notifications for significant changes
- Watchlist analytics

## Month 3: Product-Market Fit (Days 61-90)
### Priority 7: Competitive positioning
- Run competitive user test (25 users, 3 platforms)
- Document StockStory advantages (speed, comprehensiveness, transparency)
- Create comparison page vs Screener/Tickertape

### Priority 8: Revenue exploration
- Free tier: 10 stocks in watchlist, basic Superpage
- Pro tier: Unlimited watchlist, Portfolio Doctor, Compare, historical predictions
- Institutional tier: API access, bulk exports, white-label

### Priority 9: Alpha publication
- Once 100+ validated: publish "StockStory Hit Rate: XX%"
- Submit to alpha discovery platforms
- Academic paper draft on factor composite scoring in Indian markets

## What NOT to Build
- ❌ Stock recommendations engine
- ❌ Portfolio rebalancing
- ❌ Broker integration
- ❌ Real-time trading signals
- ❌ AI-generated investment advice
- ❌ Market timing indicators

## Success Metrics (Day 90)
- 1000+ MAU
- 3+ sessions/user/week
- 5 minutes average session duration
- 80%+ prediction hit rate (directional)
- Trust Centre fully populated
- 0 SEBI compliance issues
