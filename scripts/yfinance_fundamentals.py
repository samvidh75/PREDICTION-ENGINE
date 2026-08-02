import yfinance as yf, sys, json
symbol = sys.argv[1] if len(sys.argv) > 1 else 'RELIANCE'
try:
    t = yf.Ticker(f"{symbol}.NS")
    info = t.info
    if not info:
        info = {}
    result = {
        "pe": info.get("trailingPE") or info.get("forwardPE"),
        "pb": info.get("priceToBook"),
        "eps": info.get("trailingEps") or info.get("forwardEps"),
        "dividendYield": round(info["dividendYield"] * 100, 2) if info.get("dividendYield") else None,
        "roe": round(info["returnOnEquity"] * 100, 1) if info.get("returnOnEquity") else None,
        "debtToEquity": info.get("debtToEquity"),
        "revenueGrowth": round(info["revenueGrowth"] * 100, 1) if info.get("revenueGrowth") else None,
        "profitGrowth": round(info["earningsGrowth"] * 100, 1) if info.get("earningsGrowth") else None,
        "marketCap": info.get("marketCap"),
        "revenue": info.get("totalRevenue"),
        "netIncome": info.get("netIncomeToCommon"),
        "freeCashFlow": info.get("freeCashFlow"),
        "currentRatio": info.get("currentRatio"),
        "returnOnAssets": round(info["returnOnAssets"] * 100, 1) if info.get("returnOnAssets") else None,
        "sector": info.get("sector"),
        "industry": info.get("industry"),
        "companyName": info.get("longName") or info.get("shortName"),
    }
    if result.get("pe") or result.get("pb") or result.get("roe"):
        print(json.dumps(result))
    else:
        sys.exit(1)
except Exception as e:
    sys.exit(1)
