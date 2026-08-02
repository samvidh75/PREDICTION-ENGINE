const { execSync } = require('child_process');
const path = require('path');
const symbol = process.argv[2] || 'RELIANCE';
const scriptPath = path.resolve(__dirname, 'yfinance_fundamentals.py');
try {
  const raw = execSync(`python3 "${scriptPath}" "${symbol}"`, { timeout: 20000, encoding: 'utf-8' });
  const parsed = JSON.parse(raw.trim());
  if (parsed.pe || parsed.pb || parsed.roe || parsed.companyName) {
    console.log(raw.trim());
  } else {
    process.exit(1);
  }
} catch(e) {
  process.exit(1);
}
