/**
 * TRACK-46 Agent A v2 — Screener.in Scraper with real-HTML parsing
 * Usage: node scripts/track46_agentA_v2.cjs
 */
const https = require('https');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'stockstory.db');
const REPORT_DIR = path.join(__dirname, '..', 'reports', 'track-46');
if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

function R(name, content) { fs.writeFileSync(path.join(REPORT_DIR, name), content, 'utf-8'); console.log('  OK ' + name); }

function fetchPage(slug) {
  return new Promise((resolve) => {
    const url = `https://www.screener.in/company/${slug}/consolidated/`;
    const req = https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 20000
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, html: d }));
    });
    req.on('error', e => resolve({ error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ error: 'timeout' }); });
  });
}

function parseFundamentals(html) {
  if (!html || html.length < 1000) return null;
  const r = {};
  
  // Screener.in embeds data in <li> elements with "name" and "value" spans
  // Pattern: <span class="name">ROCE</span><span class="number">25.3%</span>
  
  function extract(label, targetKey, transform) {
    // Find the label in the HTML
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`${escaped}[\\s\\S]{0,200}?<span[^>]*class="number"[^>]*>([\\d.,₹%\\s]+)<\\/span>`, 'i');
    const match = html.match(regex);
    if (match) {
      let val = match[1].trim();
      val = val.replace(/₹/g, '').replace(/,/g, '').replace(/%/g, '').trim();
      r[targetKey] = transform ? transform(val) : parseFloat(val);
      return true;
    }
    return false;
  }
  
  // Market Cap
  const mcMatch = html.match(/Market Cap[^<]*<span[^>]*class="number"[^>]*>₹?\s*([\d,]+)\s*(Cr|Lac)?/i);
  if (mcMatch) {
    let mc = parseFloat(mcMatch[1].replace(/,/g, ''));
    if (mcMatch[2] === 'Cr') mc *= 10000000; // Cr = crore
    else if (mcMatch[2] === 'Lac') mc *= 100000;
    else mc *= 10000000; // Default assume Cr
    r.market_cap = mc;
  }
  
  // Try more aggressive extraction - look for all <span class="number"> elements near labels
  const labelMap = {
    'Stock P/E': 'pe_ratio',
    'ROCE': 'roce',
    'ROE': 'roe',
    'Book Value': 'book_value',
    'Dividend Yield': 'dividend_yield',
    'EPS': 'eps',
  };
  
  // Find all name-value pairs in the ratios section
  const ratioSection = html.substring(
    html.indexOf('company-ratios'),
    html.indexOf('company-ratios') + 50000
  );
  
  // Pattern: <span class="name">LABEL</span> followed by numbers
  const nameValueRegex = /<span[^>]*class="name"[^>]*>\s*([^<]+)\s*<\/span>\s*(?:[\s\S]{0,50}?)<span[^>]*class="(?:number|value)"[^>]*>\s*([\d.,₹%]+)\s*<\/span>/gi;
  let nvMatch;
  while ((nvMatch = nameValueRegex.exec(ratioSection)) !== null) {
    const label = nvMatch[1].trim();
    const value = nvMatch[2].trim().replace(/₹/g, '').replace(/,/g, '').replace(/%/g, '').trim();
    const numVal = parseFloat(value);
    if (!isNaN(numVal)) {
      // Map common labels
      const field = labelMap[label];
      if (field) r[field] = numVal;
    }
  }
  
  // Try extracting from the full HTML for remaining fields
  function extractField(label) {
    const idx = html.indexOf(label);
    if (idx < 0) return null;
    const sub = html.substring(idx, idx + 300);
    const numMatch = sub.match(/<span[^>]*class="number"[^>]*>₹?\s*([\d.,₹%]+)\s*<\/span>/i);
    if (numMatch) {
      let v = numMatch[1].replace(/₹/g, '').replace(/,/g, '').replace(/%/g, '').trim();
      return parseFloat(v);
    }
    return null;
  }
  
  // Extract remaining fields
  const fields = ['Debt to equity', 'Interest Coverage', 'Current Ratio', 'OPM', 'NPM'];
  const fieldKeys = ['debt_equity', 'interest_coverage', 'current_ratio', 'operating_margin', 'net_margin'];
  fields.forEach((f, i) => {
    const val = extractField(f);
    if (val !== null) r[fieldKeys[i]] = val;
  });
  
  // Sales & Profit Growth from text
  const sgMatch = html.match(/Compounded Sales Growth[^:]*:\s*<span[^>]*>([\d.]+)%/i);
  const pgMatch = html.match(/Compounded Profit Growth[^:]*:\s*<span[^>]*>([\d.]+)%/i);
  if (sgMatch) r.sales_growth_10y = parseFloat(sgMatch[1]);
  if (pgMatch) r.profit_growth_10y = parseFloat(pgMatch[1]);
  
  // Promoter holdings
  const phMatch = html.match(/Promoters[^<]*<span[^>]*class="number"[^>]*>([\d.]+)%/i);
  if (phMatch) r.promoter_holdings = parseFloat(phMatch[1]);
  
  // Company name from title
  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  if (titleMatch) r.company_name = titleMatch[1].replace(/ consolidated.*/, '').trim();
  
  // Sector
  const secMatch = html.match(/Sector[^<]*<a[^>]*>([^<]+)<\/a>/i);
  if (secMatch) r.sector = secMatch[1].trim();
  
  // Count how many useful fields we got
  const count = Object.keys(r).filter(k => r[k] !== null && r[k] !== undefined && !isNaN(r[k])).length;
  r._field_count = count;
  
  return count >= 3 ? r : null;
}

async function main() {
  console.log('=== TRACK-46 AGENT A v2: SCREENER.IN FUNDAMENTALS ===\n');
  
  const symbols = db.prepare('SELECT DISTINCT symbol FROM daily_prices ORDER BY symbol').all().map(r => r.symbol);
  console.log(`Target: ${symbols.length} symbols\n`);
  
  db.exec(`DROP TABLE IF EXISTS fundamental_registry`);
  db.exec(`CREATE TABLE fundamental_registry (
    symbol TEXT PRIMARY KEY, data_date TEXT, source TEXT DEFAULT 'screener.in',
    market_cap REAL, pe_ratio REAL, pb_ratio REAL, eps REAL, book_value REAL,
    roe REAL, roce REAL, debt_equity REAL, interest_coverage REAL,
    current_ratio REAL, operating_margin REAL, net_margin REAL,
    sales_growth_10y REAL, profit_growth_10y REAL,
    dividend_yield REAL, promoter_holdings REAL,
    company_name TEXT, sector TEXT
  )`);
  
  const insert = db.prepare(`INSERT OR REPLACE INTO fundamental_registry 
    (symbol, data_date, source, market_cap, pe_ratio, pb_ratio, eps, book_value,
     roe, roce, debt_equity, interest_coverage, current_ratio,
     operating_margin, net_margin, sales_growth_10y, profit_growth_10y,
     dividend_yield, promoter_holdings, company_name, sector)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  
  const today = new Date().toISOString().split('T')[0];
  let success = 0, fail = 0;
  const fieldCoverage = {};
  
  for (let i = 0; i < symbols.length; i++) {
    const sym = symbols[i];
    const slug = sym.replace('.NS', '');
    process.stdout.write(`[${i + 1}/${symbols.length}] ${sym}... `);
    
    const page = await fetchPage(slug);
    if (page.error) { console.log('NETWORK ERROR'); fail++; continue; }
    if (page.status !== 200) { console.log(`HTTP ${page.status}`); fail++; continue; }
    
    const f = parseFundamentals(page.html);
    if (!f) { console.log('PARSE FAILED (page loaded but no data extracted)'); fail++; continue; }
    
    for (const k of Object.keys(f).filter(k => !k.startsWith('_'))) {
      fieldCoverage[k] = (fieldCoverage[k] || 0) + 1;
    }
    
    insert.run(sym, today, 'screener.in',
      f.market_cap || null, f.pe_ratio || null, f.pb_ratio || null,
      f.eps || null, f.book_value || null,
      f.roe || null, f.roce || null, f.debt_equity || null,
      f.interest_coverage || null, f.current_ratio || null,
      f.operating_margin || null, f.net_margin || null,
      f.sales_growth_10y || null, f.profit_growth_10y || null,
      f.dividend_yield || null, f.promoter_holdings || null,
      f.company_name || null, f.sector || null
    );
    success++;
    console.log(`OK (${f._field_count} fields)`);
    
    if (i < symbols.length - 1) await new Promise(r => setTimeout(r, 2000));
  }
  
  const total = db.prepare('SELECT COUNT(*) as c FROM fundamental_registry').get().c;
  const withRoe = db.prepare('SELECT COUNT(*) as c FROM fundamental_registry WHERE roe IS NOT NULL').get().c;
  
  let report = '# TRACK-46 Agent A: Fundamental Data Platform\n\n';
  report += `## Results\n- Success: ${success}/${symbols.length}\n- Failed: ${fail}\n- Rows: ${total}\n- With ROE: ${withRoe}\n\n`;
  report += '## Field Coverage\n\n| Field | Available |\n|-------|----------|\n';
  for (const [k, v] of Object.entries(fieldCoverage).sort((a, b) => b[1] - a[1])) report += `| ${k} | ${v}/${symbols.length} |\n`;
  
  report += '\n## Sample\n\n| Symbol | ROE | PE | D/E | OPM | NPM |\n|--------|-----|----|-----|-----|-----|\n';
  db.prepare('SELECT * FROM fundamental_registry LIMIT 10').all().forEach(s => 
    report += `| ${s.symbol} | ${s.roe?.toFixed(1)||'-'}% | ${s.pe_ratio?.toFixed(1)||'-'} | ${s.debt_equity?.toFixed(2)||'-'} | ${s.operating_margin?.toFixed(1)||'-'}% | ${s.net_margin?.toFixed(1)||'-'}% |\n`
  );
  
  const verdict = total > 0 ? 'FUNDAMENTALS_ACTIVATED' : 'FUNDAMENTALS_BLOCKED';
  report += `\n## Verdict: **${verdict}**\n`;
  R('01-FundamentalDataPlatform.md', report);
  
  console.log(`\nDone: ${success} symbols, ${Object.keys(fieldCoverage).length} field types`);
  db.close();
}

main().catch(e => { console.error(e); try { db.close(); } catch {} process.exit(1); });
