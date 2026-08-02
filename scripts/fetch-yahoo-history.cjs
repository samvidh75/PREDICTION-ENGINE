const https = require('https');
const symbol = process.argv[2] || 'RELIANCE';
const now = Math.floor(Date.now() / 1000);
https.get(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}.NS?period1=${now - 365*86400}&period2=${now}&interval=1d`, {
  headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', 'Accept': 'application/json' },
  timeout: 10000,
}, (res) => {
  let d = '';
  res.on('data', c => d += c.toString());
  res.on('end', () => {
    if (res.statusCode !== 200) { process.exit(1); return; }
    try {
      const j = JSON.parse(d);
      const r = j?.chart?.result?.[0];
      const ts = r?.timestamp || [];
      const q = r?.indicators?.quote?.[0];
      if (!ts.length || !q) { process.exit(1); return; }
      const pts = [];
      for (let i = 0; i < ts.length; i++) {
        const c = q.close?.[i];
        if (c != null) pts.push({
          date: new Date(ts[i] * 1000).toISOString().split('T')[0],
          open: q.open?.[i] ?? c, high: q.high?.[i] ?? c, low: q.low?.[i] ?? c,
          close: c, volume: q.volume?.[i] ?? 0,
        });
      }
      if (!pts.length) { process.exit(1); return; }
      console.log(JSON.stringify(pts));
    } catch(e) { process.exit(1); }
  });
}).on('error', () => process.exit(1));
