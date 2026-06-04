# BACKFILL READINESS REPORT

## Overview
This report evaluates the warehouse's capacity and performance configurations for storing **10 years of historical daily prices** across the stock coverage universe.

---

## 1. Row Count Estimations

* **Trading Days per Year**: ~250 days
* **Years of History**: 10 years
* **Data Points per Ticker**: 2,500 rows (candles)
* **Symbol Coverage Universe**:
  * **Core NSE Stocks**: ~2,000 tickers
  * **BSE Unique Stocks**: ~3,000 tickers
  * **Total Ticker Coverage**: ~5,000 tickers

### Estimated Total Row Counts:
* **`symbols` Table**: 5,000 rows
* **`daily_prices` Table**: 5,000 tickers × 2,500 candles = **12,500,000 rows**
* **`financial_snapshots` Table**: 5,000 tickers × 10 years × 4 quarters = **200,000 rows**
* **`news_articles` Table**: 5,000 tickers × 50 articles/year = **2,500,000 rows**

---

## 2. Storage Size Estimations

### Daily Prices Table Size:
Each row in the `daily_prices` table consists of:
* `symbol`: VARCHAR(20) (~10 bytes)
* `trade_date`: DATE (4 bytes)
* `open`, `high`, `low`, `close`, `adjusted_close`: NUMERIC(12,4) (5 × 9 bytes = 45 bytes)
* `volume`: BIGINT (8 bytes)
* **Average Row Payload**: ~67 bytes
* **PostgreSQL Row Overhead** (including tuple header + padding): ~83 bytes
* **Total Storage per Row**: ~150 bytes

**Total Raw Data Storage**:
$$12,500,000 \text{ rows} \times 150 \text{ bytes} \approx 1,875,000,000 \text{ bytes} \approx 1.875 \text{ GB}$$

---

## 3. Indexes & B-Tree Storage

To support high-performance queries for model training, the following indexes are defined:
1. **Primary Key `(symbol, trade_date)`**:
   * B-Tree index size: ~32 bytes per entry + overhead = ~40 bytes per row.
   * **Total PK Index Size**: $12.5\text{M rows} \times 40\text{ bytes} \approx 500\text{ MB}$.
2. **Date Index `idx_daily_prices_date`** (`trade_date` column):
   * B-Tree index size: ~20 bytes per entry + overhead = ~30 bytes per row.
   * **Total Date Index Size**: $12.5\text{M rows} \times 30\text{ bytes} \approx 375\text{ MB}$.

### Total Index Size:
$$\approx 875\text{ MB}$$

---

## 4. Total Storage Footprint Summary

| Database Object | Estimated Rows | Storage Size |
|-----------------|----------------|--------------|
| **`symbols` Table** | 5,000 | < 1 MB |
| **`daily_prices` Table** | 12,500,000 | 1.88 GB |
| **`financial_snapshots` Table** | 200,000 | 30 MB |
| **`news_articles` Table** | 2,500,000 | 500 MB |
| **Indexes (All Tables)** | - | 950 MB |
| **Total Disk Allocation** | **15,205,000** | **3.36 GB** |

---

## 5. Warehouse Scalability & Recommendations
* **Disk Space**: A standard SSD with 5 GB of free space is more than sufficient.
* **Memory/Caching (Shared Buffers)**: With a total active footprint of ~3.36 GB, PostgreSQL's `shared_buffers` should ideally be set to `1 GB` (or 25% of system RAM) so the entire database can reside in memory for ultra-low latency reads.
* **Vacuuming**: Weekly `VACUUM ANALYZE` is recommended during bulk load operations to clean up dead tuples and update B-Tree planner statistics.
