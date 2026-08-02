const { execSync } = require('child_process');
const symbol = process.argv[2] || 'RELIANCE';

try {
  const script = `
import yfinance as yf, json
t = yf.Ticker("${symbol}.NS")
try:
    info = t.info
except:
    info = {}
print(json.dumps({
    "pe": info.get("trailingPE") or info.get("forwardPE"),
    "pb": info.get("priceToBook"),
    "eps": info.get("trailingEps") or info.get("forwardEps"),
    "dividendYield": (info.get("dividendYield") or 0) * 100 if info.get("dividendYield") else None,
    "roe": (info.get("returnOnEquity") or 0) * 100 if info.get("returnOnEquity") else None,
    "debtToEquity": info.get("debtToEquity"),
    "revenueGrowth": (info.get("revenueGrowth") or 0) * 100 if info.get("revenueGrowth") else None,
    "profitGrowth": (info.get("earningsGrowth") or 0) * 100 if info.get("earningsGrowth") else None,
    "marketCap": info.get("marketCap"),
    "revenue": info.get("totalRevenue"),
    "netIncome": info.get("netIncomeToCommon"),
    "freeCashFlow": info.get("freeCashFlow"),
    "currentRatio": info.get("currentRatio"),
    "returnOnAssets": (info.get("returnOnAssets") or 0) * 100 if info.get("returnOnAssets") else None,
    "sector": info.get("sector"),
    "industry": info.get("industry"),
    "companyName": info.get("longName") or info.get("shortName"),
}))
`;
  const raw = execSync(`python3 -c "${script.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, { timeout: 15000, encoding: 'utf-8' });
  const parsed = JSON.parse(raw.trim());
  if (parsed.pe || parsed.pb || parsed.roe) {
    console.log(JSON.stringify(parsed));
  } else {
    process.exit(1);
  }
} catch(e) {
  process.exit(1);
}
