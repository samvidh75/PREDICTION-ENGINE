"""TRACK-38 — YFinance Python Bridge
Provides JSON output for Node.js consumption.

Usage: python yfinance_bridge.py <command> <args>
Commands:
  historical <symbol> [period]
  historical-batch <symbols_csv> [period] [interval]
  quotes <symbols_csv> [delay_seconds]
"""
import sys
import json
import os
import time

try:
    import yfinance as yf
except Exception:  # pragma: no cover - depends on optional local runtime
    yf = None

def ticker_for(symbol):
    if yf is None:
        raise RuntimeError("Python package yfinance is required. Install requirements-yfinance.txt.")
    return yf.Ticker(symbol)


def cache_settings():
    path = os.environ.get("YFINANCE_CACHE_PATH", "tmp/yfinance-quote-cache.json")
    ttl_seconds = int(os.environ.get("YFINANCE_CACHE_SECONDS", "3600"))
    return path, ttl_seconds


def load_cache():
    path, _ = cache_settings()
    if not os.path.exists(path):
        return {}
    try:
        with open(path, "r", encoding="utf-8") as handle:
            return json.load(handle)
    except Exception:
        return {}


def save_cache(cache):
    path, _ = cache_settings()
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(cache, handle)


def get_cached_quote(cache, symbol):
    _, ttl_seconds = cache_settings()
    entry = cache.get(symbol)
    if not entry:
        return None
    if time.time() - float(entry.get("cachedAt", 0)) > ttl_seconds:
        return None
    return entry.get("data")

def get_historical(symbol, period="5y"):
    ticker = ticker_for(symbol)
    hist = ticker.history(period=period)
    if hist.empty:
        return []
    hist = hist.reset_index()
    rows = []
    for _, row in hist.iterrows():
        rows.append({
            "date": str(row["Date"].date()),
            "open": float(row["Open"]),
            "high": float(row["High"]),
            "low": float(row["Low"]),
            "close": float(row["Close"]),
            "volume": int(row["Volume"]),
            "dividends": float(row.get("Dividends", 0)),
            "stock_splits": float(row.get("Stock Splits", 0)),
        })
    return rows


def get_historical_batch(symbols, period="1mo", interval="1d"):
    if yf is None:
        raise RuntimeError("Python package yfinance is required. Install requirements-yfinance.txt.")
    tickers = " ".join(symbols)
    kwargs = {
        "period": period,
        "interval": interval,
        "group_by": "ticker",
        "threads": True,
        "progress": False,
        "auto_adjust": False,
    }
    data = yf.download(tickers, **kwargs)
    if data is None or getattr(data, "empty", False):
        return {"symbols": symbols, "rows": 0, "latestClose": {}, "errors": []}

    latest_close = {}
    for symbol in symbols:
        try:
            close_series = data[symbol]["Close"] if len(symbols) > 1 else data["Close"]
            close_series = close_series.dropna()
            latest_close[symbol] = None if close_series.empty else float(close_series.iloc[-1])
        except Exception:
            latest_close[symbol] = None
    return {
        "symbols": symbols,
        "rows": int(len(data)),
        "latestClose": latest_close,
        "errors": [],
    }

def get_quotes(symbols, delay_seconds=1.0):
    results = {}
    cache = load_cache()
    cache_changed = False
    for index, sym in enumerate(symbols):
        cached = get_cached_quote(cache, sym)
        if cached is not None:
            results[sym] = cached
            continue
        if index > 0:
            time.sleep(delay_seconds)
        try:
            t = ticker_for(sym)
            info = t.info
            results[sym] = {
                "symbol": sym,
                "marketCap": info.get("marketCap"),
                "trailingPE": info.get("trailingPE"),
                "forwardPE": info.get("forwardPE"),
                "priceToBook": info.get("priceToBook"),
                "earningsPerShare": info.get("trailingEps"),
                "dividendYield": info.get("dividendYield"),
                "beta": info.get("beta"),
                "debtToEquity": info.get("debtToEquity"),
                "currentRatio": info.get("currentRatio"),
                "returnOnEquity": info.get("returnOnEquity"),
                "returnOnAssets": info.get("returnOnAssets"),
                "revenueGrowth": info.get("revenueGrowth"),
                "earningsGrowth": info.get("earningsGrowth"),
                "grossMargins": info.get("grossMargins"),
                "operatingMargins": info.get("operatingMargins"),
                "profitMargins": info.get("profitMargins"),
                "shortName": info.get("shortName"),
                "sector": info.get("sector"),
                "industry": info.get("industry"),
            }
            cache[sym] = {"cachedAt": time.time(), "data": results[sym]}
            cache_changed = True
        except Exception as e:
            results[sym] = {"error": str(e)}
    if cache_changed:
        save_cache(cache)
    return results

def get_dividends(symbol):
    ticker = ticker_for(symbol)
    divs = ticker.dividends
    if divs.empty:
        return []
    rows = []
    for date_val, amount in divs.items():
        rows.append({"date": str(date_val.date()), "amount": float(amount)})
    return rows

def get_splits(symbol):
    ticker = ticker_for(symbol)
    splits = ticker.splits
    if splits.empty:
        return []
    rows = []
    for date_val, ratio in splits.items():
        rows.append({"date": str(date_val.date()), "ratio": float(ratio)})
    return rows

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No command specified"}))
        sys.exit(1)

    cmd = sys.argv[1]

    try:
        if cmd == "historical":
            symbol = sys.argv[2]
            period = sys.argv[3] if len(sys.argv) > 3 else "5y"
            data = get_historical(symbol, period)
            print(json.dumps(data))
        elif cmd == "historical-batch":
            symbols = [s.strip() for s in sys.argv[2].split(",") if s.strip()]
            period = sys.argv[3] if len(sys.argv) > 3 else "1mo"
            interval = sys.argv[4] if len(sys.argv) > 4 else "1d"
            data = get_historical_batch(symbols, period, interval)
            print(json.dumps(data))
        elif cmd == "quotes":
            symbols = [s.strip() for s in sys.argv[2].split(",") if s.strip()]
            delay_seconds = float(sys.argv[3]) if len(sys.argv) > 3 else 1.0
            data = get_quotes(symbols, delay_seconds)
            print(json.dumps(data))
        elif cmd == "dividends":
            symbol = sys.argv[2]
            data = get_dividends(symbol)
            print(json.dumps(data))
        elif cmd == "splits":
            symbol = sys.argv[2]
            data = get_splits(symbol)
            print(json.dumps(data))
        else:
            print(json.dumps({"error": f"Unknown command: {cmd}"}))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
