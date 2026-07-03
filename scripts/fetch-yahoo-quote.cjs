const https = require('https');
const symbol = process.argv[2] || 'RELIANCE';
https.get(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}.NS?range=1d&interval=1m`, {
  headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', 'Accept': 'application/json' },
  timeout: 10000,
}, (res) => {
  let d = '';
  res.on('data', c => d += c.toString());
  res.on('end', () => {
    if (res.statusCode !== 200) { process.exit(1); return; }
    try {
      const j = JSON.parse(d);
      const m = j?.chart?.result?.[0]?.meta;
      if (!m?.regularMarketPrice) { process.exit(1); return; }
      const closes = (j?.chart?.result?.[0]?.indicators?.quote?.[0]?.close || []).filter(v => v !== null);
      const latest = closes[closes.length - 1] ?? m.regularMarketPrice;
      const prevClose = m.chartPreviousClose ?? latest;
      console.log(JSON.stringify({
        price: Number(latest.toFixed(2)),
        change: Number((latest - prevClose).toFixed(2)),
        changePercent: prevClose > 0 ? Number((((latest - prevClose) / prevClose) * 100).toFixed(2)) : 0,
        marketCap: m.marketCap ? Math.round(m.marketCap / 10000000 * 100) / 100 : null,
      }));
    } catch(e) { process.exit(1); }
  });
}).on('error', () => process.exit(1));
