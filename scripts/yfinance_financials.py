import yfinance as yf, sys, json
symbol = sys.argv[1] if len(sys.argv) > 1 else 'RELIANCE'
try:
    t = yf.Ticker(f"{symbol}.NS")
    info = t.info
    annual_revenue = []
    annual_profit = []
    annual_ebitda = []

    if t.financials is not None and not t.financials.empty:
        fs = t.financials
        for col in fs.columns[:8]:
            year = str(col.year)
            if 'Total Revenue' in fs.index:
                val = fs.loc['Total Revenue', col]
                if val and val == val:
                    annual_revenue.append({"period": f"FY{year}", "value": round(val)})
            elif 'Operating Revenue' in fs.index:
                val = fs.loc['Operating Revenue', col]
                if val and val == val:
                    annual_revenue.append({"period": f"FY{year}", "value": round(val)})

            if 'Net Income' in fs.index:
                val = fs.loc['Net Income', col]
                if val and val == val:
                    annual_profit.append({"period": f"FY{year}", "value": round(val)})

            if 'EBITDA' in fs.index:
                val = fs.loc['EBITDA', col]
                if val and val == val:
                    annual_ebitda.append({"period": f"FY{year}", "value": round(val)})

    # Fallback to info if DataFrame not available
    if not annual_revenue and info.get("totalRevenue"):
        annual_revenue = [{"period": "FY2025", "value": info["totalRevenue"]}]
    if not annual_profit and info.get("netIncomeToCommon"):
        annual_profit = [{"period": "FY2025", "value": info["netIncomeToCommon"]}]

    result = {
        "financials": {
            "annual": {
                "revenue": annual_revenue,
                "profit": annual_profit,
                "ebitda": annual_ebitda,
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
            "ebitda": info.get("ebitda"),
        }
    }
    has_data = bool(annual_revenue or annual_profit or result["info"].get("revenue"))
    if has_data:
        print(json.dumps(result))
    else:
        sys.exit(1)
except Exception as e:
    sys.exit(1)
