# AGENT K — Roadmap Prioritisation

## P0 — Must Ship Before Public Launch
1. **Prediction data pipeline** — automated daily gen + validation
2. **Rate limiting** on all public endpoints
3. **Data completeness indicator** on every score
4. **Trust Centre link** from Superpage transparency section
5. **Empty state teaching copy** on all pages
6. **"Last updated" timestamps** everywhere

## P1 — Must Ship Before Paid Plans
1. **PostgreSQL migration** (SQLite won't scale past 500)
2. **Watchlist email alerts** (retention)
3. **Portfolio Doctor what-if simulation** (conversion)
4. **Superpage "Compare with..." quick-link** (engagement)
5. **Data completeness score per symbol** (trust)
6. **SEBI certification badge** on Trust Centre (credibility)
7. **Prediction journal first 100 records** (trust foundation)

## P2 — Can Wait
1. Redis caching layer
2. Mobile app
3. CSV export
4. Academic methodology paper
5. Community features
6. Broker import
7. Dark mode
8. Custom reports
9. Screener-like raw financial tables
10. API tier for institutions

## What NOT to Build (Ever)
1. Stock recommendations/buy-sell signals
2. Portfolio rebalancing suggestions
3. Real-time trading dashboards
4. AI market commentary
5. Social trading/community copying
6. Broker execution integration
7. Derivatives/options analysis
8. Cryptocurrency support

## 90-Day Execution Order
1. Week 1-2: Prediction pipeline + timestamps (P0 #1, #6)
2. Week 3-4: Rate limiting + data completeness (P0 #2, #3)
3. Week 5-6: Trust Centre wiring + empty states (P0 #4, #5)
4. Week 7-8: PostgreSQL migration (P1 #1)
5. Week 9-10: Watchlist alerts + Portfolio What-if (P1 #2, #3)
6. Week 11-12: Prediction journal seeding + SEBI badge (P1 #7, #6)
