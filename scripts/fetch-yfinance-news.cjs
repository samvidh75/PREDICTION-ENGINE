const { execSync } = require('child_process');
const path = require('path');
const symbol = process.argv[2] || 'RELIANCE';
try {
  const raw = execSync(`python3 "${path.resolve(__dirname, 'yfinance_news.py')}" "${symbol}"`, { timeout: 20000, encoding: 'utf-8' });
  const parsed = JSON.parse(raw.trim());
  if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].headline) {
    console.log(raw.trim());
  } else {
    process.exit(1);
  }
} catch(e) {
  process.exit(1);
}
