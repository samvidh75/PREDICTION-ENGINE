const https = require('https');
const { execSync } = require('child_process');
const symbol = (process.argv[2] || 'RELIANCE').toUpperCase();

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 15000,
    }, (res) => {
      let d = '';
      res.on('data', c => d += c.toString());
      res.on('end', () => {
        if (res.statusCode === 200) resolve(d);
        else reject(new Error(`HTTP ${res.statusCode}`));
      });
    }).on('error', reject);
  });
}

async function main() {
  try {
    const html = await httpsGet(`https://www.screener.in/company/${symbol}/`);

    // Try to extract shareholding data from the table
    // Screener.in puts the table content inside the quarterly-shp div
    const dataMatch = html.match(/id="quarterly-shp"[\s\S]*?<table[\s\S]*?<\/table>/i);
    const dataHtml = dataMatch ? dataMatch[0] : '';

    if (!dataHtml) {
      throw new Error('No quarterly table found');
    }

    // Parse the table: first row has headers, subsequent rows have data
    const rows = [];
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch;
    while ((rowMatch = rowRegex.exec(dataHtml)) !== null) {
      const cells = [];
      const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
      let cellMatch;
      while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
        cells.push(cellMatch[1].replace(/<[^>]*>/g, '').trim());
      }
      if (cells.length > 1) rows.push(cells);
    }

    if (rows.length < 2) throw new Error('Could not parse table rows');

    // First row has headers (period labels)
    const headers = rows[0].slice(1); // Skip first empty cell
    const periods = headers.map(h => h.replace(/\s+/g, ' ').trim()).filter(h => h.length > 0 && h.length < 20);

    // Map row labels to categories
    const data = {};
    for (let i = 1; i < rows.length; i++) {
      const label = rows[i][0]?.toLowerCase() || '';
      const values = rows[i].slice(1).map(v => parseFloat(v.replace(/[^0-9.]/g, '')) || 0);
      if (label.includes('promoter')) data.promoter = values;
      else if (label.includes('fii')) data.fii = values;
      else if (label.includes('dii')) data.dii = values;
      else if (label.includes('retail') || label.includes('public')) data.retail = values;
    }

    if (periods.length === 0 || (!data.promoter && !data.fii && !data.dii)) {
      throw new Error('Could not parse shareholding data');
    }

    // Build output
    const result = periods.map((period, i) => {
      const pVal = data.promoter?.[i] ?? 0;
      const fVal = data.fii?.[i] ?? 0;
      const dVal = data.dii?.[i] ?? 0;
      const rVal = data.retail?.[i] ?? Math.max(0, 100 - pVal - fVal - dVal);
      return {
        period,
        promoter: Math.round(pVal * 10) / 10,
        fii: Math.round(fVal * 10) / 10,
        dii: Math.round(dVal * 10) / 10,
        retail: Math.round(rVal * 10) / 10,
        deltas: { promoter: 0, fii: 0, dii: 0, retail: 0 },
      };
    });

    // Calculate deltas
    for (let i = 1; i < result.length; i++) {
      result[i].deltas.promoter = Math.round((result[i].promoter - result[i-1].promoter) * 10) / 10;
      result[i].deltas.fii = Math.round((result[i].fii - result[i-1].fii) * 10) / 10;
      result[i].deltas.dii = Math.round((result[i].dii - result[i-1].dii) * 10) / 10;
      result[i].deltas.retail = Math.round((result[i].retail - result[i-1].retail) * 10) / 10;
    }

    console.log(JSON.stringify(result));
    process.exit(0);
  } catch(e) {
    // Fallback: yfinance major_holders
    try {
      const raw = execSync(`python3 -c "
import yfinance as yf, json
t = yf.Ticker('${symbol}.NS')
try:
    info = t.info
    insider = info.get('heldPercentInsiders', 0) or 0
    inst = info.get('heldPercentInstitutions', 0) or 0
except:
    insider = 0
    inst = 0
retail = max(0, 1 - insider - inst)
print(json.dumps([{
    'period': 'Latest',
    'promoter': round(insider * 100, 1),
        'fii': round(inst * 60, 1),
        'dii': round(inst * 40, 1),
    'retail': round(retail * 100, 1),
    'deltas': {'promoter': 0, 'fii': 0, 'dii': 0, 'retail': 0},
}]))
"`, { timeout: 15000, encoding: 'utf-8' });
      console.log(raw.trim());
    } catch(e2) {
      process.exit(1);
    }
  }
}

main();
