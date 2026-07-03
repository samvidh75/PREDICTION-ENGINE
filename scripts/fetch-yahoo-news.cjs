const https = require('https');
const symbol = process.argv[2] || 'RELIANCE';
https.get(`https://query1.finance.yahoo.com/v1/finance/search?q=${symbol}&lang=en-IN&region=IN&quotesCount=0&newsCount=6`, {
  headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', 'Accept': 'application/json' },
  timeout: 10000,
}, (res) => {
  let d = '';
  res.on('data', c => d += c.toString());
  res.on('end', () => {
    if (res.statusCode !== 200) { process.exit(1); return; }
    try {
      const j = JSON.parse(d);
      const articles = ((j?.news || [])).slice(0, 5).map(item => ({
        headline: item.title || '',
        source: item.publisher || 'Financial News',
        time: item.providerPublishTime ? new Date(item.providerPublishTime * 1000).toISOString() : new Date().toISOString(),
        link: item.link || undefined,
      }));
      if (!articles.length) { process.exit(1); return; }
      console.log(JSON.stringify(articles));
    } catch(e) { process.exit(1); }
  });
}).on('error', () => process.exit(1));
