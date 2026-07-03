const https = require('https');
const symbol = process.argv[2] || 'RELIANCE';
https.get(`https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}.NS?modules=financialData,defaultKeyStatistics,summaryDetail`, {
  headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', 'Accept': 'application/json' },
  timeout: 10000,
}, (res) => {
  let d = '';
  res.on('data', c => d += c.toString());
  res.on('end', () => {
    if (res.statusCode !== 200) { process.exit(1); return; }
    try {
      const j = JSON.parse(d);
      const qs = j?.quoteSummary?.result?.[0];
      if (!qs) { process.exit(1); return; }
      const fd = qs.financialData || {};
      const ks = qs.defaultKeyStatistics || {};
      const sd = qs.summaryDetail || {};
      console.log(JSON.stringify({
        pe: sd.trailingPE?.raw ?? sd.forwardPE?.raw ?? null,
        pb: sd.priceToBook?.raw ?? null,
        eps: ks.trailingEps?.raw ?? ks.forwardEps?.raw ?? null,
        dividendYield: sd.dividendYield?.raw ? Number((sd.dividendYield.raw * 100).toFixed(2)) : null,
        roe: fd.returnOnEquity?.raw ? Number((fd.returnOnEquity.raw * 100).toFixed(1)) : null,
        debtToEquity: fd.debtToEquity?.raw ? Number(fd.debtToEquity.raw.toFixed(2)) : null,
        revenueGrowth: fd.revenueGrowth?.raw ? Number((fd.revenueGrowth.raw * 100).toFixed(1)) : null,
      }));
    } catch(e) { process.exit(1); }
  });
}).on('error', () => process.exit(1));
