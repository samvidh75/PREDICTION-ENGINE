#!/usr/bin/env python3
"""
slm_math_runtime.py -- StockEX Unadjusted Pricing Core.
Primary: Google Finance live scraping (unadjusted, real-time).
Fallback: Yahoo Finance historical candles (adjusted, for SMA/RSI).
Strict fail-fast if both sources return empty.

Usage:
    python3 slm_math_runtime.py --ticker SBIN
    python3 slm_math_runtime.py --batch RELIANCE,TCS,500325
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

try:
    from bs4 import BeautifulSoup
except ImportError:
    BeautifulSoup = None

DATABASE_URL = os.getenv("DATABASE_URL")

GOOGLE_FINANCE_URL = "https://www.google.com/finance/quote/{ticker}:{exchange}"

YAHOO_MIRRORS = [
    "https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?interval=1d&range=1y&includeAdjustedClose=false",
    "https://query2.finance.yahoo.com/v8/finance/chart/{ticker}?interval=1d&range=1y&includeAdjustedClose=false",
]


def _to_yahoo_ticker(symbol: str) -> str:
    s = symbol.upper().replace(".NS", "").replace(".BO", "").strip()
    return f"{s}.BO" if s.isdigit() else f"{s}.NS"


def _to_google_exchange(symbol: str) -> tuple:
    """Returns (clean_symbol, exchange_code) for Google Finance URL."""
    s = symbol.upper().replace(".NS", "").replace(".BO", "").strip()
    exchange = "BOM" if s.isdigit() else "NSE"
    return s, exchange


def fetch_google_finance_live_price(symbol: str) -> float | None:
    """
    Scrapes the live unadjusted spot price from Google Finance.
    Uses a multi-strategy extraction pipeline to resist layout changes:
      1. data-last-price attribute (structural metadata, class-agnostic)
      2. og:price:amount meta tag
      3. Title tag price extraction
      4. Known CSS class selectors (N6SYTe, fxKb6c, YMlKec, YMlbe)
      5. First page element containing ₹
    """
    if BeautifulSoup is None:
        return None
    clean_symbol, exchange = _to_google_exchange(symbol)
    url = GOOGLE_FINANCE_URL.format(ticker=clean_symbol, exchange=exchange)
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
    }
    try:
        res = requests.get(url, headers=headers, timeout=8)
        if res.status_code != 200:
            return None
        soup = BeautifulSoup(res.text, "html.parser")

        # Strategy 1: data-last-price attribute (structural, class-agnostic)
        container = soup.find(attrs={"data-last-price": True})
        if container:
            try:
                return float(container["data-last-price"])
            except (ValueError, TypeError):
                pass

        # Strategy 2: og:price:amount meta tag
        meta_price = soup.find("meta", attrs={"property": "og:price:amount"})
        if meta_price and meta_price.get("content"):
            try:
                return float(meta_price["content"].replace(",", ""))
            except (ValueError, TypeError):
                pass

        # Strategy 3: Title tag parsing (format: "TCS Stock Price, Live ...")
        if soup.title:
            parts = soup.title.text.replace(",", "").split(" ")
            for p in parts:
                p_clean = p.replace("₹", "").strip()
                try:
                    v = float(p_clean)
                    if 1 < v < 1000000:
                        return v
                except ValueError:
                    continue

        # Strategy 4: Known CSS class selectors
        for cls in ("N6SYTe", "fxKb6c", "YMlKec", "YMlbe"):
            el = soup.find("div", class_=cls)
            if el:
                raw = el.text.replace("₹", "").replace(",", "").replace(" ", "").strip()
                try:
                    return float(raw)
                except ValueError:
                    continue

        # Strategy 5: First element with ₹ text that looks like a valid price
        for el in soup.find_all(["div", "span"]):
            txt = el.get_text(strip=True)
            if txt.startswith("₹"):
                raw = txt.replace("₹", "").replace(",", "").strip()
                try:
                    v = float(raw)
                    if 1 < v < 1000000:
                        return v
                except ValueError:
                    continue
    except Exception:
        return None
    return None


def fetch_yahoo_historical_candles(symbol: str) -> pd.DataFrame:
    """
    Fetches historical candle data from Yahoo Finance for SMA/RSI calculations.
    Uses includeAdjustedClose=false to request unadjusted data (best-effort).
    """
    yahoo_ticker = _to_yahoo_ticker(symbol)
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    for mirror in YAHOO_MIRRORS:
        url = mirror.format(ticker=yahoo_ticker)
        try:
            res = requests.get(url, headers=headers, timeout=7)
            if res.status_code != 200:
                continue
            data = res.json()
            result = data.get("chart", {}).get("result", [None])[0]
            if not result:
                continue
            timestamps = result.get("timestamp", [])
            quotes = result.get("indicators", {}).get("quote", [{}])[0]
            if not timestamps or not quotes or not quotes.get("close"):
                meta = result.get("meta", {})
                cp = float(meta.get("regularMarketPrice", 0.0))
                if cp == 0.0:
                    continue
                return pd.DataFrame({"close": [cp], "volume": [100000], "timestamp": [0]})
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
                return pd.DataFrame(rows)
        except Exception:
            continue
    return pd.DataFrame()


def run_precision_intelligence_kernel(ticker: str):
    symbol = ticker.upper().replace(".NS", "").replace(".BO", "").strip()
    df = pd.DataFrame()
    data_source = "UNKNOWN"

    # Step 1: Fetch live unadjusted price from Google Finance (authoritative)
    live_price = fetch_google_finance_live_price(symbol)
    if live_price and live_price > 0:
        data_source = "GOOGLE_FINANCE_LIVE"

    # Step 2: Query Neon PostgreSQL cache layers
    if DATABASE_URL:
        try:
            import psycopg2
            conn = psycopg2.connect(DATABASE_URL)
            candle_query = (
                "SELECT close, volume, timestamp FROM asset_historical_candles "
                "WHERE ticker = %s ORDER BY timestamp DESC LIMIT 250;"
            )
            df = pd.read_sql_query(candle_query, conn, params=[symbol])
            conn.close()
            if not df.empty:
                data_source = "POSTGRES_CACHE"
        except Exception:
            pass

    # Step 3: Fallback to Yahoo Finance for historical candles (for SMA/RSI)
    if df.empty:
        df = fetch_yahoo_historical_candles(symbol)
        if not df.empty:
            # Keep Google source label if we got live price, otherwise mark Yahoo
            if not live_price:
                data_source = "YAHOO_HISTORICAL"

    # Step 4: Fail-fast if no data at all
    if df.empty and not live_price:
        return {
            "success": False,
            "error": f"CRITICAL DATA FAULT: Target token '{symbol}' has no upstream data. Google Finance and all backup channels returned empty."
        }

    # Step 5: Compute technical indicators
    if not df.empty:
        if "timestamp" in df.columns:
            df = df.sort_values("timestamp").reset_index(drop=True)
        else:
            df = df.iloc[::-1].reset_index(drop=True)

        current_close = float(df["close"].iloc[-1])
        sma_50 = float(df["close"].rolling(window=50).mean().iloc[-1]) if len(df) >= 50 else current_close
        sma_200 = float(df["close"].rolling(window=200).mean().iloc[-1]) if len(df) >= 200 else current_close

        if len(df) >= 15:
            delta = df["close"].diff()
            gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
            loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
            rs = gain / loss
            rsi_14 = float(100 - (100 / (1 + rs.iloc[-1]))) if not pd.isna(rs.iloc[-1]) else 50.000
        else:
            rsi_14 = 50.000
    else:
        current_close = live_price
        sma_50 = live_price
        sma_200 = live_price
        rsi_14 = 50.000

    # Step 6: Use Google Finance live price as authoritative current_price
    # (overrides any adjusted close from Yahoo)
    final_price = live_price if live_price else current_close
    if final_price is None:
        return {"success": False, "error": f"Price resolution failed for '{symbol}'."}
    fp = final_price
    s50 = sma_50 if sma_50 is not None else fp
    s200 = sma_200 if sma_200 is not None else fp
    r14 = rsi_14 if rsi_14 is not None else 50.0

    # Step 7: Trend state determination
    if fp > s50 and s50 > s200:
        trend_state = "STRONG_BULLISH_CONVERGENCE"
    elif fp < s50 and s50 < s200:
        trend_state = "BEARISH_DOWN_DRIFT"
    else:
        trend_state = "CONSOLIDATION_RANGE"

    compiled_metrics = {
        "ticker": symbol,
        "current_price": round(fp, 3),
        "sma_50": round(s50, 3),
        "sma_200": round(s200, 3),
        "rsi_14": round(r14, 3),
        "trend_state": trend_state,
        "data_mode": data_source,
    }

    return {"success": True, "metrics": compiled_metrics}


def main():
    parser = argparse.ArgumentParser(description="StockEX Google Finance Core")
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
