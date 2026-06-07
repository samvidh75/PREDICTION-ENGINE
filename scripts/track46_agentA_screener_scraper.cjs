/**
 * TRACK-46 Agent A — FUNDAMENTAL DATA PLATFORM: Screener.in Scraper
 * Fetches real fundamentals for all current symbols from Screener.in.
 * Populates fundamental_registry table with 16+ fields per symbol.
 * 
 * Usage: node scripts/track46_agentA_screener_scraper.cjs
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

function R(name, content) {
  fs.writeFileSync(path.join(REPORT_DIR, name), content, 'utf-8');
  console.log('  OK ' + name);
}

// Screener.in uses simple HTTP GET with proper headers for company pages
// URL pattern: https://www.screener.in/company/COMPANY_NAME/consolidated/
function fetchScreenerPage(symbol) {
  return new Promise((resolve) => {
    // Map symbol to screener.in slug
    const slug = symbol.replace('.NS', '');
    const url = `https://www.screener.in/company/${slug}/consolidated/`;
    
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      timeout: 15000,
    }, (res) => {
      // Screener.in redirects to standalone if consolidated not available
      if (res.statusCode === 301 || res.statusCode === 302) {
        const redirectUrl = res.headers.location;
        if (redirectUrl && redirectUrl.includes('standalone')) {
          // Try standalone instead
          const standaloneReq = https.get(`https://www.screener.in/company/${slug}/`, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': 'text/html',
            },
            timeout: 15000,
          }, (res2) => {
            let data = '';
            res2.on('data', d => data += d);
            res2.on('end', () => resolve({ html: data, status: res2.statusCode, symbol, slug }));
          });
          standaloneReq.on('error', () => resolve(null));
          standaloneReq.on('timeout', () => { standaloneReq.destroy(); resolve(null); });
          return;
        }
      }
      
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve({ html: data, status: res.statusCode, symbol, slug }));
    });
    req.on('error', (e) => resolve({ error: e.message, symbol, slug }));
    req.on('timeout', () => { req.destroy(); resolve({ error: 'timeout', symbol, slug }); });
  });
}

// Parse fundamentals from Screener.in HTML
function parseFundamentals(html) {
  if (!html || html.length < 500) return null;
  
  const result = {};
  
  // Screener.in data is in specific HTML structures. Key metrics are in:
  // - "company-ratios" list items
  // - Tables with class "data-table"
  // - Number spans with class "number"
  
  // Market Cap — usually in the top summary
  const mcMatch = html.match(/Market Cap[^<]*<span[^>]*>([\d,]+)/i);
  if (mcMatch) result.market_cap = parseInt(mcMatch[1].replace(/,/g, '')) * 10000000; // Cr format
  
  // PE Ratio
  const peMatch = html.match(/Stock P\/E[^<]*<span[^>]*class="number"[^>]*>([\d.]+)/i);
  if (peMatch) result.pe_ratio = parseFloat(peMatch[1]);
  
  // ROE — in ratios section
  const roeMatch = html.match(/ROE[^<]*<span[^>]*class="number"[^>]*>([\d.]+)%/i);
  if (!roeMatch) {
    const roeMatch2 = html.match(/Return on equity[^<]*<span[^>]*>([\d.]+)/i);
    if (roeMatch2) result.roe = parseFloat(roeMatch2[1]);
  } else {
    result.roe = parseFloat(roeMatch[1]);
  }
  
  // ROCE
  const roceMatch = html.match(/ROCE[^<]*<span[^>]*class="number"[^>]*>([\d.]+)%/i);
  if (roceMatch) result.roce = parseFloat(roceMatch[1]);
  
  // Debt to Equity
  const deMatch = html.match(/Debt to equity[^<]*<span[^>]*class="number"[^>]*>([\d.]+)/i);
  if (deMatch) result.debt_equity = parseFloat(deMatch[1]);
  
  // Interest Coverage
  const icMatch = html.match(/Interest Coverage[^<]*<span[^>]*class="number"[^>]*>([\d.]+)/i);
  if (icMatch) result.interest_coverage = parseFloat(icMatch[1]);
  
  // Current Ratio
  const crMatch = html.match(/Current Ratio[^<]*<span[^>]*class="number"[^>]*>([\d.]+)/i);
  if (crMatch) result.current_ratio = parseFloat(crMatch[1]);
  
  // OPM
  const opmMatch = html.match(/OPM[^<]*<span[^>]*class="number"[^>]*>([\d.]+)%/i);
  if (opmMatch) result.operating_margin = parseFloat(opmMatch[1]);
  
  // NPM
  const npmMatch = html.match(/NPM[^<]*<span[^>]*class="number"[^>]*>([\d.]+)%/i);
  if (npmMatch) result.net_margin = parseFloat(npmMatch[1]);
  
  // EPS
  const epsMatch = html.match(/EPS[^<]*<span[^>]*class="number"[^>]*>Rs\.\s*([\d.]+)/i);
  if (epsMatch) result.eps = parseFloat(epsMatch[1]);
  
  // BVPS
  const bvMatch = html.match(/Book Value[^<]*<span[^>]*class="number"[^>]*>Rs\.\s*([\d.]+)/i);
  if (bvMatch) result.book_value = parseFloat(bvMatch[1]);
  
  // Dividend Yield
  const dyMatch = html.match(/Dividend Yield[^<]*<span[^>]*class="number"[^>]*>([\d.]+)%/i);
  if (dyMatch) result.dividend_yield = parseFloat(dyMatch[1]);
  
  // Sales Growth (3 years)
  const sgMatch = html.match(/Sales Growth[^<]*<span[^>]*class="number"[^>]*>([\d.]+)%/i);
  if (sgMatch) result.sales_growth_3y = parseFloat(sgMatch[1]);
  
  // Profit Growth
  const pgMatch = html.match(/Profit Growth[^<]*<span[^>]*class="number"[^>]*>([\d.]+)%/i);
  if (pgMatch) result.profit_growth_3y = parseFloat(pgMatch[1]);
  
  // Promoter Holdings
  const phMatch = html.match(/Promoters[^<]*<span[^>]*class="number"[^>]*>([\d.]+)%/i);
  if (phMatch) result.promoter_holdings = parseFloat(phMatch[1]);
  
  // P/B Ratio
  const pbMatch = html.match(/Book Value P\/B[^<]*<span[^>]*class="number"[^>]*>([\d.]+)/i);
  if (pbMatch) result.pb_ratio = parseFloat(pbMatch[1]);
  
  // Sector from header
  const sectorMatch = html.match(/Sector[^<]*<[^>]*>([^<]+)</i);
  if (sectorMatch) result.sector = sectorMatch[1].trim();
  
  // Company name
  const nameMatch = html.match(/<title>([^<]+)<\/title>/);
  if (nameMatch) {
    result.company_name = nameMatch[1].replace(' consolidated', '').replace(' standalone', '').trim();
  }
  
  return Object.keys(result).length > 2 ? result : null;
}

// Main execution
async function main() {
  console.log('=== TRACK-46 AGENT A: SCREENER.IN FUNDAMENTAL SCRAPER ===\n');
  
  const symbols = db.prepare('SELECT DISTINCT symbol FROM daily_prices ORDER BY symbol').all().map(r => r.symbol);
  console.log(`Target: ${symbols.length} symbols\n`);
  
  // Create fundamental_registry table
  db.exec(`DROP TABLE IF EXISTS fundamental_registry`);
  db.exec(`CREATE TABLE fundamental_registry (
    symbol TEXT NOT NULL, data_date TEXT NOT NULL, source TEXT DEFAULT 'screener.in',
    market_cap REAL, pe_ratio REAL, pb_ratio REAL, eps REAL, book_value REAL,
    roe REAL, roce REAL, debt_equity REAL, interest_coverage REAL,
    current_ratio REAL, operating_margin REAL, net_margin REAL,
    sales_growth_3y REAL, profit_growth_3y REAL,
    dividend_yield REAL, promoter_holdings REAL,
    company_name TEXT, sector TEXT,
    raw_fields_json TEXT,
    PRIMARY KEY (symbol, data_date)
  )`);
  
  const today = new Date().toISOString().split('T')[0];
  const insert = db.prepare(`INSERT OR REPLACE INTO fundamental_registry 
    (symbol, data_date, source, market_cap, pe_ratio, pb_ratio, eps, book_value,
     roe, roce, debt_equity, interest_coverage, current_ratio,
     operating_margin, net_margin, sales_growth_3y, profit_growth_3y,
     dividend_yield, promoter_holdings, company_name, sector, raw_fields_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  
  let success = 0, fail = 0, partialFields = 0;
  const fieldCoverage = {};
  
  for (let i = 0; i < symbols.length; i++) {
    const sym = symbols[i];
    process.stdout.write(`[${i + 1}/${symbols.length}] ${sym}... `);
    
    const page = await fetchScreenerPage(sym);
    
    if (!page || page.error) {
      console.log(`FAILED: ${page?.error || 'no response'}`);
      fail++;
      continue;
    }
    
    if (page.status === 403 || page.status === 429) {
      console.log(`BLOCKED (${page.status}) — Screener.in may have rate limiting`);
      fail++;
      continue;
    }
    
    const fundamentals = parseFundamentals(page.html);
    
    if (!fundamentals) {
      console.log('NO FUNDAMENTALS (page loaded but parsing failed)');
      fail++;
      continue;
    }
    
    // Track field coverage
    for (const k of Object.keys(fundamentals)) {
      fieldCoverage[k] = (fieldCoverage[k] || 0) + 1;
    }
    
    const fieldCount = Object.keys(fundamentals).filter(k => k !== 'symbol' && k !== 'company_name' && k !== 'sector').length;
    
    insert.run(
      sym, today, 'screener.in',
      fundamentals.market_cap || null, fundamentals.pe_ratio || null,
      fundamentals.pb_ratio || null, fundamentals.eps || null,
      fundamentals.book_value || null,
      fundamentals.roe || null, fundamentals.roce || null,
      fundamentals.debt_equity || null, fundamentals.interest_coverage || null,
      fundamentals.current_ratio || null,
      fundamentals.operating_margin || null, fundamentals.net_margin || null,
      fundamentals.sales_growth_3y || null, fundamentals.profit_growth_3y || null,
      fundamentals.dividend_yield || null, fundamentals.promoter_holdings || null,
      fundamentals.company_name || null, fundamentals.sector || null,
      JSON.stringify(fundamentals)
    );
    
    success++;
    console.log(`OK (${fieldCount} fields)`);
    
    // Rate limit: be polite to Screener.in
    if (i < symbols.length - 1) await new Promise(r => setTimeout(r, 1000 + Math.random() * 1000));
  }
  
  // Summary
  const total = db.prepare('SELECT COUNT(*) as c FROM fundamental_registry').get().c;
  
  let report = `# TRACK-46 Agent A: Fundamental Data Platform\n**Date:** ${new Date().toISOString()}\n\n`;
  report += `## Results\n- **Success**: ${success}/${symbols.length}\n- **Failed**: ${fail}\n- **Total rows**: ${total}\n\n`;
  report += `## Field Coverage\n\n| Field | Available | Rate |\n|-------|-----------|------|\n`;
  for (const [field, count] of Object.entries(fieldCoverage).sort((a, b) => b[1] - a[1])) {
    report += `| ${field} | ${count}/${symbols.length} | ${(count/symbols.length*100).toFixed(0)}% |\n`;
  }
  
  // Sample data
  const samples = db.prepare('SELECT symbol, roe, debt_equity, sales_growth_3y, operating_margin, net_margin, company_name FROM fundamental_registry LIMIT 10').all();
  report += `\n## Sample Data\n\n| Symbol | Company | ROE | D/E | Sales Gr | OPM | NPM |\n|--------|---------|-----|-----|----------|-----|-----|\n`;
  for (const s of samples) {
    report += `| ${s.symbol} | ${s.company_name || 'N/A'} | ${s.roe?.toFixed(1) || '-'}% | ${s.debt_equity?.toFixed(2) || '-'} | ${s.sales_growth_3y?.toFixed(1) || '-'}% | ${s.operating_margin?.toFixed(1) || '-'}% | ${s.net_margin?.toFixed(1) || '-'}% |\n`;
  }
  
  const verdict = total > 0 ? 'FUNDAMENTALS_ACTIVATED' : 'FUNDAMENTALS_BLOCKED';
  report += `\n## Verdict: **${verdict}**\n`;
  report += `## Success Criterion: fundamental_registry populated → ${total > 0 ? 'MET ✅' : 'NOT MET ❌'}\n`;
  
  R('01-FundamentalDataPlatform.md', report);
  
  console.log(`\n=== RESULTS ===`);
  console.log(`  Symbols: ${success} populated, ${fail} failed`);
  console.log(`  Total rows: ${total}`);
  console.log(`  Fields: ${Object.keys(fieldCoverage).length} types available`);
  console.log(`\n=== AGENT A COMPLETE ===`);
  
  db.close();
}

main().catch(e => { console.error(e); try { db.close(); } catch {} process.exit(1); });
