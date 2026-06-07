# AGENT B — Database Health Audit

## Tables and Schema
| Table | Migration | Purpose |
|-------|-----------|---------|
| symbols | 001 | Security master (NSE/BSE symbols) |
| daily_prices | 001 | OHLCV daily price data |
| financial_snapshots | 002 | Quarterly financials (PE, EPS, ROE, etc.) |
| feature_snapshots | 003 | Technical indicators (RSI, MACD, ADX) |
| factor_snapshots | 004 | Factor scores (quality, value, growth, etc.) |
| shareholding_patterns | 004 | Promoter/FII/DII/Public holdings |
| corporate_timeline | 004 | Corporate actions timeline |
| prediction_registry | 008 | Immutable prediction records |
| daily_prediction_snapshots | 008 | Daily top/bottom rankings |
| valuation_snapshots | added | PE/PB/EV/EBITDA valuations |
| news_articles | added | Symbol-news linkage |
| symbols (intelligence) | added | Sector mapping for engine inputs |

## Database Health
- **Engine**: better-sqlite3 (embedded SQLite)
- **Location**: data/stockstory.db
- **WAL mode**: Enabled for concurrent read/write
- **Indexes**: Present on symbol + trade_date for all core tables
- **Migrations**: 8 migrations tracked (001-008)

## Freshness Assessment
- Latest data depends on populating scripts (yfinance/Screener)
- Trade date freshness: varies (daily population recommended but not automated as cron)
- Financial snapshot freshness: quarterly (per Indian reporting cycle)

## Storage Growth
- SQLite single file: manageable for < 10,000 symbols with 5 years of daily data
- Estimated growth: ~2MB/month with 1000 symbols
- WAL files: temporary, auto-merged

## Recommendations
1. Add ANALYZE after bulk inserts for query plan optimization
2. Monitor WAL file size after batch operations
3. Consider periodic VACUUM for storage reclamation
4. Add data/stockstory.db to .gitignore properly (already appears to be)
