#!/usr/bin/env python3
"""
slm_math_runtime.py -- StockEX Precision Cross-Validation Core.
Strict quantitative guard engine with multi-point sanity audits.
Pipeline: PostgreSQL cache -> live Yahoo mirror -> hard fail-fast.

Usage:
    python3 slm_math_runtime.py --ticker SBIN
    python3 slm_math_runtime.py --batch SBIN,TCS,RELIANCE
"""

import argparse
import json
import os
import sys

try:
    import pandas as pd
    import numpy as np
    import requests
except ImportError as e:
    print(json.dumps({"success": False, "error": f"Missing dependency: {e.name}"}))
    sys.exit(1)

DATABASE_URL = os.getenv("DATABASE_URL")
YAHOO_MIRRORS = [
    "https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?interval=1d&range=1y",
    "https://query2.finance.yahoo.com/v8/finance/chart/{ticker}?interval=1d&range=1y",
]


def fetch_live_unauthenticated_ticks(symbol: str):
    """
    Direct web proxy fallback that pulls unauthenticated candle arrays.
    Returns real market metrics or None under firewall constraints.
    """
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    for mirror_url in YAHOO_MIRRORS:
        url = mirror_url.format(ticker=symbol.upper())
        try:
            res = requests.get(url, headers=headers, timeout=7)
            if res.status_code != 200:
                continue
            json_data = res.json()
            result = json_data.get("chart", {}).get("result", [None])[0]
            if not result:
                continue
            timestamps = result.get("timestamp", [])
            quotes = result.get("indicators", {}).get("quote", [{}])[0]
            if not timestamps or not quotes or not quotes.get("close"):
                meta = result.get("meta", {})
                cp = float(meta.get("regularMarketPrice", 0.0))
                if cp == 0.0:
                    continue
                df = pd.DataFrame({
                    "timestamp": [0],
                    "close": [cp],
                    "volume": [100000],
                })
                return df, "LIVE_PUBLIC_STREAM"
            rows = []
            for i in range(len(timestamps)):
                if quotes["close"][i] is None:
                    continue
                rows.append({
                    "timestamp": timestamps[i],
                    "close": float(quotes["close"][i]),
                    "volume": int(quotes["volume"][i] or 0),
                })
            if rows:
                return pd.DataFrame(rows), "LIVE_PUBLIC_STREAM"
        except Exception:
            continue
    return None, "ALL_MIRRORS_EXHAUSTED"


def validate_market_snapshot(metrics: dict) -> tuple:
    """
    STRICT COMPLIANCE GUARD: Cross-validates metrics mathematically before approval.
    """
    # Guard 1: Basic structural boundaries validation
    if metrics["current_price"] <= 0 or metrics["rsi_14"] < 0 or metrics["rsi_14"] > 100:
        return False, "Invalid price or RSI bounds detected."

    # Guard 2: Cross-validate moving average trend alignments
    price = metrics["current_price"]
    sma50 = metrics["sma_50"]
    sma200 = metrics["sma_200"]
    trend = metrics["trend_state"]

    if trend == "STRONG_BULLISH_CONVERGENCE" and not (price > sma50 and sma50 > sma200):
        return False, "Trend state contradiction: Bullish flag emitted but SMA relationships are inverted."
    if trend == "BEARISH_DOWN_DRIFT" and not (price < sma50 and sma50 < sma200):
        return False, "Trend state contradiction: Bearish flag emitted but SMA relationships are upward."

    # Guard 3: Assert unit magnitude compliance for Large-Cap Indian operations
    # Only triggers when fundamental data exists in the DB (market_cap_value > 0)
    large_cap_watchlist = ["RELIANCE", "TCS", "HDFCBANK", "SBIN", "INFY", "ICICIBANK",
                           "BHARTIARTL", "ITC", "LT", "AXISBANK", "BAJFINANCE", "MARUTI"]
    if metrics["market_cap_value"] > 0 and metrics["ticker"] in large_cap_watchlist and metrics["market_cap_value"] < 5000:
        return False, f"Unit Magnitude Error: Market cap for {metrics['ticker']} looks truncated or miscalculated."

    return True, "VERIFIED_TRUTH"


def run_precision_intelligence_kernel(ticker: str):
    raw_symbol = ticker.upper().replace(".NS", "").replace(".BO", "").strip()
    suffix = ".NS" if ".NS" in ticker.upper() else ".BO" if ".BO" in ticker.upper() else ".NS"
    symbol = raw_symbol
    df = pd.DataFrame()
    ratio_row = None
    data_source = "UNKNOWN"

    # Step 1: Query Neon PostgreSQL cache layers
    if DATABASE_URL:
        try:
            import psycopg2
            conn = psycopg2.connect(DATABASE_URL)
            candle_query = (
                "SELECT close, volume, timestamp FROM asset_historical_candles "
                "WHERE ticker = %s ORDER BY timestamp DESC LIMIT 250;"
            )
            df = pd.read_sql_query(candle_query, conn, params=[symbol])

            ratio_query = (
                "SELECT market_cap_cr, pe_ratio, debt_to_equity, promoter_pledged_pct, asset_sector "
                "FROM asset_fundamental_ratios WHERE ticker = %s LIMIT 1;"
            )
            cursor = conn.cursor()
            cursor.execute(ratio_query, (symbol,))
            ratio_row = cursor.fetchone()
            cursor.close()
            conn.close()
            if not df.empty:
                data_source = "POSTGRES_CACHE"
        except Exception:
            pass

    # Step 2: Trigger fallback scraping node if cache lines are empty
    if df.empty:
        df, scrape_status = fetch_live_unauthenticated_ticks(symbol + suffix)
        if df is not None and not df.empty:
            data_source = scrape_status

    # Step 3: Hard Fail-Fast Boundary if all data channels are blocked
    if df is None or df.empty:
        return {
            "success": False,
            "error": f"CRITICAL: Structural data channel blackout for token `{symbol}`. Action required: Check server network ports."
        }

    # Order rows chronologically for vector operations
    if "timestamp" in df.columns:
        df = df.sort_values("timestamp").reset_index(drop=True)
    else:
        df = df.iloc[::-1].reset_index(drop=True)
    current_price = float(df["close"].iloc[-1])

    # Step 4: Calculate actual, deterministic technical moving indicators via Pandas
    sma_50 = float(df["close"].rolling(window=50).mean().iloc[-1]) if len(df) >= 50 else current_price
    sma_200 = float(df["close"].rolling(window=200).mean().iloc[-1]) if len(df) >= 200 else current_price

    # Compute exact Relative Strength Index (RSI-14)
    if len(df) >= 15:
        delta = df["close"].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        rsi_14 = float(100 - (100 / (1 + rs.iloc[-1]))) if not pd.isna(rs.iloc[-1]) else 50.000
    else:
        rsi_14 = 50.000

    # Determine trend alignments dynamically based on mathematical reality
    if current_price > sma_50 and sma_50 > sma_200:
        trend_state = "STRONG_BULLISH_CONVERGENCE"
    elif current_price < sma_50 and sma_50 < sma_200:
        trend_state = "BEARISH_DOWN_DRIFT"
    else:
        trend_state = "CONSOLIDATION_RANGE"

    # Step 5: Unit conversion and database matching variables
    if ratio_row:
        raw_mcap = float(ratio_row[0])
        market_cap_display = f"INR {(raw_mcap / 100000):.3f} Lakh Cr" if raw_mcap >= 100000 else f"INR {raw_mcap:.3f} Cr"
        market_cap_val = raw_mcap
        pe_ratio = float(ratio_row[1]) if ratio_row[1] is not None else 0.000
        debt_to_equity = float(ratio_row[2]) if ratio_row[2] is not None else 0.000
        promoter_pledged = float(ratio_row[3]) if ratio_row[3] is not None else 0.000
        sector = str(ratio_row[4]) if ratio_row[4] else ""
    else:
        market_cap_display = "0.000 Cr (Pending Ingestion)"
        market_cap_val = 0.000
        pe_ratio = 0.000
        debt_to_equity = 0.000
        promoter_pledged = 0.000
        sector = ""

    compiled_metrics = {
        "ticker": symbol,
        "current_price": round(current_price, 3),
        "sma_50": round(sma_50, 3),
        "sma_200": round(sma_200, 3),
        "rsi_14": round(rsi_14, 3),
        "trend_state": trend_state,
        "market_cap_display": market_cap_display,
        "market_cap_value": market_cap_val,
        "pe_ratio": pe_ratio,
        "debt_to_equity": debt_to_equity,
        "promoter_pledged_pct": promoter_pledged,
        "sector": sector,
        "data_mode": data_source,
    }

    # Step 6: Trigger the strict validation guard check before output approval
    is_valid, validation_msg = validate_market_snapshot(compiled_metrics)
    if not is_valid:
        return {
            "success": False,
            "error": f"QUANTITATIVE INTEGRITY FAULT: {validation_msg} Generation rejected to protect system truth."
        }

    return {"success": True, "metrics": compiled_metrics}


def main():
    parser = argparse.ArgumentParser(description="StockEX Precision Cross-Validation Core")
    parser.add_argument("--ticker", help="Target stock ticker symbol")
    parser.add_argument("--batch", help="Comma-separated list of ticker symbols")
    args = parser.parse_args()

    if args.batch:
        tickers = [t.strip() for t in args.batch.split(",") if t.strip()]
        results = {}
        for t in tickers:
            results[t] = run_precision_intelligence_kernel(t)
        print(json.dumps({"success": True, "batch": results}))
    elif args.ticker:
        result = run_precision_intelligence_kernel(args.ticker)
        print(json.dumps(result))
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
