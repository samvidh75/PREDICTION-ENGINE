import yfinance as yf, sys, json
symbol = sys.argv[1] if len(sys.argv) > 1 else 'RELIANCE'
try:
    t = yf.Ticker(f"{symbol}.NS")
    info = t.info
    
    # Get financials data
    annual_revenue = []
    annual_profit = []
    
    if t.financials is not None and not t.financials.empty:
        fs = t.financials
        for col in fs.columns[:8]:
            year = str(col.year)
            rev = fs.loc.get("Total Revenue", fs.loc.get("Operating Revenue", fs.loc.get("Revenue", None)))
            prof = fs.loc.get("Net Income", fs.loc.get("Net Income Common Stockholders", None))
            if rev is not None:
                annual_revenue.append({"period": f"FY{year}", "value": round(rev.loc[col]) if isinstance(rev, type(fs)) and col in rev else 0})
            if prof is not None:
                annual_profit.append({"period": f"FY{year}", "value": round(prof.loc[col]) if isinstance(prof, type(fs)) and col in prof else 0})
    
    # If financials data isn't available, use info
    if not annual_revenue and info.get("totalRevenue"):
        annual_revenue = [{"period": "FY2025", "value": info["totalRevenue"]}]
    if not annual_profit and info.get("netIncomeToCommon"):
        annual_profit = [{"period": "FY2025", "value": info["netIncomeToCommon"]}]
    
    result = {
        "financials": {
            "annual": {
                "revenue": annual_revenue,
                "profit": annual_profit,
            },
            "dataSource": "yfinance",
        },
        "info": {
            "marketCap": info.get("marketCap"),
            "enterpriseValue": info.get("enterpriseValue"),
            "revenue": info.get("totalRevenue"),
            "netIncome": info.get("netIncomeToCommon"),
            "freeCashFlow": info.get("freeCashFlow"),
            "totalDebt": info.get("totalDebt"),
            "totalCash": info.get("totalCash"),
            "bookValue": info.get("bookValue"),
            "operatingCashFlow": info.get("operatingCashFlow"),
            "grossProfit": info.get("grossProfits"),
            "ebitda": info.get("ebitda"),
        }
    }
    print(json.dumps(result))
except Exception as e:
    sys.exit(1)
