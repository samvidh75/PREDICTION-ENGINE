#!/usr/bin/env python3
"""
sme_ticker_mesh.py — StockEX SME Ticker Data Mesh.
Alternative data source for NSE SME Emerge stocks (Yahoo -SM suffix limitation).
Scrapes Screener.in for live prices, fundamental ratios, and historical closes.

Usage:
    python3 sme_ticker_mesh.py --ticker SRIVASAVI
    python3 sme_ticker_mesh.py --ticker SRIVASAVI --historical
    python3 sme_ticker_mesh.py --batch SRIVASAVI,ACE,AARON
"""

import argparse
import json
import sys
import re
from datetime import datetime

try:
    import requests
    import pandas as pd
    import numpy as np
    from bs4 import BeautifulSoup
except ImportError as e:
    print(json.dumps({"success": False, "error": f"Missing dependency: {e.name}"}))
    sys.exit(1)

SCREENER_URL = "https://www.screener.in/company/{ticker}/"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
}


def clean_ticker(symbol: str) -> str:
    """Strip suffixes to get the base Screener.in ticker."""
    return symbol.upper().replace(".NS", "").replace(".BO", "").replace("-SM", "").strip()


def fetch_screener_fundamentals(ticker: str) -> dict | None:
    """Scrape fundamental ratios from Screener.in company page."""
    url = SCREENER_URL.format(ticker=ticker)
    try:
        res = requests.get(url, headers=HEADERS, timeout=10)
        if res.status_code != 200:
            return None
        soup = BeautifulSoup(res.text, "html.parser")
        ratios = {"ticker": ticker}
        # Company ratios sidebar
        for div in soup.find_all("div", class_="company-ratios"):
            for li in div.find_all("li"):
                name_el = li.find("span", class_="name")
                val_el = li.find("span", class_="number")
                if name_el and val_el:
                    key = name_el.text.strip().lower().replace(" ", "_").replace("/", "_")
                    raw = val_el.text.strip().replace(",", "")
                    try:
                        ratios[key] = float(raw)
                    except ValueError:
                        ratios[key] = raw
        # Profit & Loss section for revenue, profit
        for section in soup.find_all("section"):
            h2 = section.find("h2")
            if h2 and "Profit & Loss" in h2.text:
                rows = section.find_all("tr")
                for row in rows:
                    cells = row.find_all("th")
                    if cells and len(cells) > 1 and "latest" in cells[-1].text.lower():
                        data_cells = row.find_all("td")
                        if data_cells:
                            label = cells[0].text.strip().lower().replace(" ", "_")
                            try:
                                ratios[f"latest_{label}"] = float(
                                    data_cells[-1].text.strip().replace(",", "")
                                )
                            except ValueError:
                                pass
        return ratios
    except Exception as e:
        return None


def fetch_screener_historical_prices(ticker: str) -> pd.DataFrame:
    """Scrape historical monthly price data from Screener.in share price table."""
    url = SCREENER_URL.format(ticker=ticker)
    try:
        res = requests.get(url, headers=HEADERS, timeout=10)
        if res.status_code != 200:
            return pd.DataFrame()
        soup = BeautifulSoup(res.text, "html.parser")
        # Share price history section
        for section in soup.find_all("section"):
            h2 = section.find("h2")
            if h2 and "Share Price" in h2.text:
                table = section.find("table")
                if not table:
                    continue
                rows = []
                for tr in table.find_all("tr")[1:]:  # skip header
                    cells = tr.find_all("td")
                    if len(cells) >= 5:
                        date_str = cells[0].text.strip()
                        try:
                            close = float(cells[4].text.strip().replace(",", ""))
                        except (ValueError, IndexError):
                            continue
                        try:
                            ts = int(datetime.strptime(date_str, "%b %Y").timestamp())
                        except ValueError:
                            try:
                                ts = int(datetime.strptime(date_str, "%Y").timestamp())
                            except ValueError:
                                continue
                        rows.append({"timestamp": ts, "close": close, "volume": 0})
                # Also try the monthly price table with different date format
                if not rows:
                    for tr in table.find_all("tr")[1:]:
                        cells = tr.find_all("td")
                        if len(cells) >= 2:
                            date_str = cells[0].text.strip()
                            try:
                                close = float(cells[1].text.strip().replace(",", ""))
                            except (ValueError, IndexError):
                                continue
                            for fmt in ("%b %Y", "%Y-%m-%d", "%d-%m-%Y", "%Y"):
                                try:
                                    ts = int(datetime.strptime(date_str, fmt).timestamp())
                                    rows.append({"timestamp": ts, "close": close, "volume": 0})
                                    break
                                except ValueError:
                                    continue
                if rows:
                    df = pd.DataFrame(rows)
                    # Also fetch current live price for the latest data point
                    live = fetch_screener_fundamentals(ticker)
                    if live and "current_price" in live:
                        now_ts = int(datetime.now().timestamp())
                        df = pd.concat([
                            df,
                            pd.DataFrame([{"timestamp": now_ts, "close": live["current_price"], "volume": 0}]),
                        ], ignore_index=True)
                    return df.sort_values("timestamp").drop_duplicates(subset=["timestamp"]).reset_index(drop=True)
        return pd.DataFrame()
    except Exception:
        return pd.DataFrame()


def run_sme_mesh(ticker: str, include_historical: bool = False) -> dict:
    symbol = clean_ticker(ticker)
    fundamentals = fetch_screener_fundamentals(symbol)

    if not fundamentals:
        return {
            "success": False,
            "error": f"Screener.in returned no data for ticker '{symbol}'. Verify the ticker exists.",
        }

    current_price = fundamentals.get("current_price", 0)
    if current_price == 0:
        return {"success": False, "error": f"No current price found for '{symbol}' on Screener.in."}

    df = pd.DataFrame()
    if include_historical:
        df = fetch_screener_historical_prices(symbol)

    if not df.empty and len(df) >= 2:
        close_series = df["close"]
        sma_50 = float(close_series.rolling(window=min(50, len(close_series))).mean().iloc[-1])
        sma_200 = float(close_series.rolling(window=min(200, len(close_series))).mean().iloc[-1])
        if len(close_series) >= 15:
            delta = close_series.diff()
            gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
            loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
            rs = gain / loss
            rsi_14 = float(100 - (100 / (1 + rs.iloc[-1]))) if not pd.isna(rs.iloc[-1]) else 50.0
        else:
            rsi_14 = 50.0
    else:
        sma_50 = current_price
        sma_200 = current_price
        rsi_14 = 50.0

    if current_price > sma_50 and sma_50 > sma_200:
        trend_state = "STRONG_BULLISH_CONVERGENCE"
    elif current_price < sma_50 and sma_50 < sma_200:
        trend_state = "BEARISH_DOWN_DRIFT"
    else:
        trend_state = "CONSOLIDATION_RANGE"

    mcap = fundamentals.get("market_cap", 0)
    mcap_display = f"INR {mcap:.3f} Cr" if mcap else "0.000 Cr (Pending Ingestion)"

    pe = fundamentals.get("stock_p_e", 0)
    book_value = fundamentals.get("book_value", 0)
    roce = fundamentals.get("roce", 0)
    roe = fundamentals.get("roe", 0)
    face_value = fundamentals.get("face_value", 0)
    dividend_yield = fundamentals.get("dividend_yield", 0)

    metrics = {
        "ticker": symbol,
        "current_price": round(current_price, 3),
        "sma_50": round(sma_50, 3),
        "sma_200": round(sma_200, 3),
        "rsi_14": round(rsi_14, 3),
        "trend_state": trend_state,
        "market_cap_display": mcap_display,
        "market_cap_value": mcap,
        "pe_ratio": round(pe, 3),
        "debt_to_equity": 0.000,
        "promoter_pledged_pct": 0.000,
        "sector": "SME Industrial Materials",
        "data_mode": "SCREENER_IN_LIVE",
        "fundamentals": {
            "market_cap_cr": mcap,
            "pe_ratio": pe,
            "book_value": book_value,
            "roce": roce,
            "roe": roe,
            "face_value": face_value,
            "dividend_yield": dividend_yield,
            "high_52w": fundamentals.get("high_low", ""),
        },
    }
    return {"success": True, "metrics": metrics}


def main():
    parser = argparse.ArgumentParser(description="StockEX SME Ticker Data Mesh")
    parser.add_argument("--ticker", help="Target SME ticker symbol")
    parser.add_argument("--batch", help="Comma-separated list of tickers")
    parser.add_argument("--historical", action="store_true", help="Include historical price scrape for SMA/RSI")
    args = parser.parse_args()

    if args.batch:
        tickers = [t.strip() for t in args.batch.split(",") if t.strip()]
        results = {}
        for t in tickers:
            results[t] = run_sme_mesh(t, args.historical)
        print(json.dumps({"success": True, "batch": results}))
    elif args.ticker:
        result = run_sme_mesh(args.ticker, args.historical)
        print(json.dumps(result))
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
