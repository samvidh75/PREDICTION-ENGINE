"""TRACK-38 — YFinance Python Bridge
Provides JSON output for Node.js consumption.
Usage: python yfinance_bridge.py <command> <args>
Commands: historical <symbol> [period], quote <symbols...>
"""
import sys
import json
import yfinance as yf

def get_historical(symbol, period="5y"):
    ticker = yf.Ticker(symbol)
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

def get_quotes(symbols):
    results = {}
    for sym in symbols:
        try:
            t = yf.Ticker(sym)
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
                "shortName": info.get("shortName"),
                "sector": info.get("sector"),
                "industry": info.get("industry"),
            }
        except Exception as e:
            results[sym] = {"error": str(e)}
    return results

def get_dividends(symbol):
    ticker = yf.Ticker(symbol)
    divs = ticker.dividends
    if divs.empty:
        return []
    rows = []
    for date_val, amount in divs.items():
        rows.append({"date": str(date_val.date()), "amount": float(amount)})
    return rows

def get_splits(symbol):
    ticker = yf.Ticker(symbol)
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
        elif cmd == "quotes":
            symbols = sys.argv[2].split(",")
            data = get_quotes(symbols)
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
