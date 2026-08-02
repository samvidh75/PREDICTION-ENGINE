const { execSync } = require('child_process');
const path = require('path');
const symbol = process.argv[2] || 'RELIANCE';
try {
  const raw = execSync(`python3 "${path.resolve(__dirname, 'yfinance_financials.py')}" "${symbol}"`, { timeout: 30000, encoding: 'utf-8' });
  const parsed = JSON.parse(raw.trim());
  if (parsed.financials?.annual?.revenue?.length || parsed.info?.revenue) {
    console.log(raw.trim());
  } else {
    process.exit(1);
  }
} catch(e) {
  process.exit(1);
}
