/**
 * TRACK-13A: Database Readiness & Snapshot Integrity Audit
 * 
 * Audits all database tables for completeness, freshness, coverage, and integrity.
 * Generates 7 reports under reports/track-13a/.
 * 
 * READ-ONLY: No modifications, no backfills, no repairs.
 */
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function main() {
  const reportsDir = path.join(__dirname, '..', 'reports', 'track-13a');
  fs.mkdirSync(reportsDir, { recursive: true });

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/stockstory'
  });

  const runDate = new Date().toISOString().split('T')[0];

  try {
    console.log('=== TRACK-13A: Database Readiness & Snapshot Integrity Audit ===\n');

    // ═══════════════════════════════════════════════════════════════
    // 1. TableInventory.md
    // ═══════════════════════════════════════════════════════════════
    console.log('Writing TableInventory.md...');

    let tableInv = `# Table Inventory — TRACK-13A\n\n`;
    tableInv += `**Date:** ${runDate}\n\n`;

    const tables = ['symbols', 'financial_snapshots', 'feature_snapshots', 'factor_snapshots', 'daily_prices', 'provider_logs', 'shareholding_patterns', 'corporate_timeline', 'news_articles'];
    
    tableInv += `| Table | Row Count | Distinct Symbols | Earliest Date | Latest Date |\n`;
    tableInv += `| --- | --- | --- | --- | --- |\n`;

    for (const table of tables) {
      try {
        const countRes = await pool.query(`SELECT COUNT(*) as cnt FROM ${table}`);
        const count = countRes.rows[0].cnt;
        
        let distinctSymbols = 'N/A';
        let earliestDate = 'N/A';
        let latestDate = 'N/A';

        try {
          const symRes = await pool.query(`SELECT COUNT(DISTINCT symbol) as cnt FROM ${table}`);
          distinctSymbols = String(symRes.rows[0].cnt);
        } catch {}

        const dateCol = table === 'financial_snapshots' ? 'period_end' : table === 'provider_logs' ? 'created_at' : table === 'news_articles' ? 'published_at' : table === 'shareholding_patterns' ? 'period_end' : table === 'corporate_timeline' ? 'event_date' : 'trade_date';
        try {
          const minRes = await pool.query(`SELECT MIN(${dateCol}) as min_d FROM ${table}`);
          earliestDate = minRes.rows[0].min_d ? new Date(minRes.rows[0].min_d).toISOString().split('T')[0] : 'NULL';
        } catch {}
        try {
          const maxRes = await pool.query(`SELECT MAX(${dateCol}) as max_d FROM ${table}`);
          latestDate = maxRes.rows[0].max_d ? new Date(maxRes.rows[0].max_d).toISOString().split('T')[0] : 'NULL';
        } catch {}

        tableInv += `| **${table}** | ${count} | ${distinctSymbols} | ${earliestDate} | ${latestDate} |\n`;
      } catch (e) {
        tableInv += `| **${table}** | ERROR: ${e.message} | | | |\n`;
      }
    }

    // Active vs inactive symbols
    const activeRes = await pool.query(`SELECT listing_status, COUNT(*) as cnt FROM symbols GROUP BY listing_status`);
    tableInv += `\n## Symbol Listing Status\n\n`;
    tableInv += `| Status | Count |\n`;
    tableInv += `| --- | --- |\n`;
    for (const row of activeRes.rows) {
      tableInv += `| ${row.listing_status} | ${row.cnt} |\n`;
    }

    // Sector distribution
    const sectorRes = await pool.query(`
      SELECT sector, COUNT(*) as cnt FROM symbols 
      WHERE listing_status = 'Active' 
      GROUP BY sector ORDER BY cnt DESC
    `);
    tableInv += `\n## Active Symbol Sector Distribution\n\n`;
    tableInv += `| Sector | Count |\n| --- | --- |\n`;
    for (const row of sectorRes.rows) {
      tableInv += `| ${row.sector || 'NULL'} | ${row.cnt} |\n`;
    }

    fs.writeFileSync(path.join(reportsDir, 'TableInventory.md'), tableInv, 'utf8');
    console.log('  Done.');

    // ═══════════════════════════════════════════════════════════════
    // 2. SnapshotCoverage.md
    // ═══════════════════════════════════════════════════════════════
    console.log('Writing SnapshotCoverage.md...');

    let snapCov = `# Snapshot Coverage — TRACK-13A\n\n`;
    snapCov += `**Date:** ${runDate}\n\n`;

    // Total active symbols
    const totalActive = (await pool.query(`SELECT COUNT(*) as cnt FROM symbols WHERE listing_status = 'Active'`)).rows[0].cnt;

    // Symbols with each snapshot type
    snapCov += `## Per-Snapshot Coverage\n\n`;
    snapCov += `| Snapshot Type | Symbols Covered | % of Active Universe |\n`;
    snapCov += `| --- | --- | --- |\n`;

    const snapTypes = [
      ['financial_snapshots', 'Financial Data'],
      ['feature_snapshots', 'Technical Features'],
      ['factor_snapshots', 'Factor Scores'],
      ['daily_prices', 'Daily Price History'],
    ];

    for (const [table, label] of snapTypes) {
      const res = await pool.query(`
        SELECT COUNT(DISTINCT s.symbol) as cnt
        FROM symbols s
        WHERE s.listing_status = 'Active'
        AND EXISTS (SELECT 1 FROM ${table} t WHERE t.symbol = s.symbol)
      `);
      snapCov += `| ${label} | ${res.rows[0].cnt} | ${(res.rows[0].cnt / totalActive * 100).toFixed(1)}% |\n`;
    }

    // Full coverage (all three snapshots)
    const fullRes = await pool.query(`
      SELECT COUNT(DISTINCT s.symbol) as cnt
      FROM symbols s
      WHERE s.listing_status = 'Active'
      AND EXISTS (SELECT 1 FROM financial_snapshots f WHERE f.symbol = s.symbol)
      AND EXISTS (SELECT 1 FROM factor_snapshots fa WHERE fa.symbol = s.symbol)
      AND EXISTS (SELECT 1 FROM feature_snapshots fe WHERE fe.symbol = s.symbol)
    `);
    snapCov += `| **All 3 Snapshots** | **${fullRes.rows[0].cnt}** | **${(fullRes.rows[0].cnt / totalActive * 100).toFixed(1)}%** |\n`;

    // Stocks with only specific snapshot types
    snapCov += `\n## Missing Snapshot Combinations\n\n`;
    snapCov += `| Combination | Count |\n| --- | --- |\n`;

    const combos = [
      ['Missing all 3', `NOT EXISTS (SELECT 1 FROM financial_snapshots fs WHERE fs.symbol = s.symbol) AND NOT EXISTS (SELECT 1 FROM factor_snapshots f WHERE f.symbol = s.symbol) AND NOT EXISTS (SELECT 1 FROM feature_snapshots fe WHERE fe.symbol = s.symbol)`],
      ['Has financial only', `EXISTS (SELECT 1 FROM financial_snapshots fs WHERE fs.symbol = s.symbol) AND NOT EXISTS (SELECT 1 FROM factor_snapshots f WHERE f.symbol = s.symbol) AND NOT EXISTS (SELECT 1 FROM feature_snapshots fe WHERE fe.symbol = s.symbol)`],
      ['Has factor only', `NOT EXISTS (SELECT 1 FROM financial_snapshots fs WHERE fs.symbol = s.symbol) AND EXISTS (SELECT 1 FROM factor_snapshots f WHERE f.symbol = s.symbol) AND NOT EXISTS (SELECT 1 FROM feature_snapshots fe WHERE fe.symbol = s.symbol)`],
      ['Has feature only', `NOT EXISTS (SELECT 1 FROM financial_snapshots fs WHERE fs.symbol = s.symbol) AND NOT EXISTS (SELECT 1 FROM factor_snapshots f WHERE f.symbol = s.symbol) AND EXISTS (SELECT 1 FROM feature_snapshots fe WHERE fe.symbol = s.symbol)`],
      ['Has financial+factor only', `EXISTS (SELECT 1 FROM financial_snapshots fs WHERE fs.symbol = s.symbol) AND EXISTS (SELECT 1 FROM factor_snapshots f WHERE f.symbol = s.symbol) AND NOT EXISTS (SELECT 1 FROM feature_snapshots fe WHERE fe.symbol = s.symbol)`],
    ];

    for (const [label, clause] of combos) {
      try {
        const res = await pool.query(`SELECT COUNT(*) as cnt FROM symbols s WHERE s.listing_status = 'Active' AND (${clause})`);
        snapCov += `| ${label} | ${res.rows[0].cnt} |\n`;
      } catch (e) {
        snapCov += `| ${label} | ERROR |\n`;
      }
    }

    // Rows per symbol for financial_snapshots
    const rowsPerSymbol = await pool.query(`
      SELECT 
        PERCENTILE_CONT(0.1) WITHIN GROUP (ORDER BY cnt) as p10,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY cnt) as p50,
        PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY cnt) as p90,
        AVG(cnt)::int as avg
      FROM (SELECT symbol, COUNT(*) as cnt FROM financial_snapshots GROUP BY symbol) sub
    `);
    snapCov += `\n## Financial Snapshot Density\n\n`;
    const dps = rowsPerSymbol.rows[0];
    snapCov += `- Avg snapshots per symbol: ${dps.avg}\n`;
    snapCov += `- P10: ${dps.p10}, P50: ${dps.p50}, P90: ${dps.p90}\n`;

    fs.writeFileSync(path.join(reportsDir, 'SnapshotCoverage.md'), snapCov, 'utf8');
    console.log('  Done.');

    // ═══════════════════════════════════════════════════════════════
    // 3. FactorCoverage.md
    // ═══════════════════════════════════════════════════════════════
    console.log('Writing FactorCoverage.md...');

    let factCov = `# Factor Coverage — TRACK-13A\n\n`;
    factCov += `**Date:** ${runDate}\n\n`;

    const factorCols = ['quality_factor', 'growth_factor', 'value_factor', 'momentum_factor', 'risk_factor', 'sector_strength_factor', 'factor_score'];
    const totalFactorRows = (await pool.query(`SELECT COUNT(*) as cnt FROM factor_snapshots`)).rows[0].cnt;
    
    factCov += `## Factor Field Coverage\n\n`;
    factCov += `| Field | Non-Null | Null | Coverage % |\n| --- | --- | --- | --- |\n`;
    
    for (const col of factorCols) {
      const res = await pool.query(`SELECT COUNT(*) as cnt FROM factor_snapshots WHERE ${col} IS NOT NULL`);
      const nonNull = res.rows[0].cnt;
      factCov += `| ${col} | ${nonNull} | ${totalFactorRows - nonNull} | ${(nonNull/totalFactorRows*100).toFixed(1)}% |\n`;
    }

    // Factor score distribution
    factCov += `\n## Factor Score Distribution\n\n`;
    factCov += `| Metric | Min | P25 | P50 | P75 | Max | Mean |\n| --- | --- | --- | --- | --- | --- | --- |\n`;
    for (const col of factorCols) {
      const res = await pool.query(`
        SELECT 
          MIN(${col}) as min_v, MAX(${col}) as max_v, AVG(${col})::numeric(8,2) as avg_v,
          PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY ${col}) as p25,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ${col}) as p50,
          PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY ${col}) as p75
        FROM factor_snapshots WHERE ${col} IS NOT NULL
      `);
      const r = res.rows[0];
      factCov += `| ${col} | ${Number(r.min_v).toFixed(1)} | ${Number(r.p25).toFixed(1)} | ${Number(r.p50).toFixed(1)} | ${Number(r.p75).toFixed(1)} | ${Number(r.max_v).toFixed(1)} | ${Number(r.avg_v).toFixed(1)} |\n`;
    }

    fs.writeFileSync(path.join(reportsDir, 'FactorCoverage.md'), factCov, 'utf8');
    console.log('  Done.');

    // ═══════════════════════════════════════════════════════════════
    // 4. FreshnessAudit.md
    // ═══════════════════════════════════════════════════════════════
    console.log('Writing FreshnessAudit.md...');

    let fresh = `# Freshness Audit — TRACK-13A\n\n`;
    fresh += `**Date:** ${runDate}\n\n`;

    const now = new Date();
    const freshnessChecks = [
      ['financial_snapshots', 'period_end', 'Financial'],
      ['feature_snapshots', 'trade_date', 'Technical Features'],
      ['factor_snapshots', 'trade_date', 'Factor Scores'],
    ];

    fresh += `## Latest Snapshot Freshness\n\n`;
    fresh += `| Snapshot Type | Latest Date | Days Old | Status |\n| --- | --- | --- | --- |\n`;

    for (const [table, col, label] of freshnessChecks) {
      const res = await pool.query(`SELECT MAX(${col}) as max_d FROM ${table}`);
      const maxDate = res.rows[0].max_d ? new Date(res.rows[0].max_d) : null;
      const daysOld = maxDate ? Math.floor((now - maxDate) / (1000 * 60 * 60 * 24)) : Infinity;
      const status = maxDate === null ? '❌ NO DATA' : daysOld <= 1 ? '✅ Live' : daysOld <= 7 ? '✅ Recent' : daysOld <= 30 ? '⚠️ Stale' : '🔴 CRITICAL';
      fresh += `| ${label} | ${maxDate ? maxDate.toISOString().split('T')[0] : 'NULL'} | ${maxDate ? daysOld : 'N/A'} | ${status} |\n`;
    }

    // Per-symbol freshness (how many symbols have stale data)
    fresh += `\n## Symbol-Level Freshness Distribution\n\n`;
    const factorAgeRes = await pool.query(`
      SELECT 
        MAX(trade_date) as latest_d,
        NOW()::date - MAX(trade_date)::date as days_old
      FROM factor_snapshots
      GROUP BY symbol
    `);
    const ages = factorAgeRes.rows.map(r => Number(r.days_old));
    fresh += `- Factor snapshots: ${ages.filter(a => a <= 1).length} symbols ≤1 day old, ${ages.filter(a => a <= 7).length} ≤7 days, ${ages.filter(a => a > 30).length} >30 days (stale)\n`;

    const finAgeRes = await pool.query(`
      SELECT 
        MAX(period_end) as latest_d,
        NOW()::date - MAX(period_end)::date as days_old
      FROM financial_snapshots
      GROUP BY symbol
    `);
    const finAges = finAgeRes.rows.map(r => Number(r.days_old));
    fresh += `- Financial snapshots: ${finAges.filter(a => a <= 30).length} symbols ≤30 days, ${finAges.filter(a => a > 90).length} >90 days (critical)\n`;

    fs.writeFileSync(path.join(reportsDir, 'FreshnessAudit.md'), fresh, 'utf8');
    console.log('  Done.');

    // ═══════════════════════════════════════════════════════════════
    // 5. UniverseCoverage.md
    // ═══════════════════════════════════════════════════════════════
    console.log('Writing UniverseCoverage.md...');

    let uniCov = `# Universe Coverage — TRACK-13A\n\n`;
    uniCov += `**Date:** ${runDate}\n\n`;

    // Known NIFTY 50 symbols
    const nifty50 = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'SBIN', 'BHARTIARTL', 'ITC', 'HINDUNILVR', 'KOTAKBANK', 'LT', 'WIPRO', 'AXISBANK', 'SUNPHARMA', 'MARUTI', 'TITAN', 'ASIANPAINT', 'BAJFINANCE', 'HCLTECH', 'ADANIENT', 'NTPC', 'POWERGRID', 'ULTRACEMCO', 'TATASTEEL', 'JSWSTEEL', 'BAJAJFINSV', 'ADANIPORTS', 'COALINDIA', 'ONGC', 'BPCL', 'HINDZINC', 'DIVISLAB', 'DRREDDY', 'CIPLA', 'BRITANNIA', 'NESTLEIND', 'EICHERMOT', 'HEROMOTOCO', 'BAJAJ-AUTO', 'TECHM', 'TATAMOTORS', 'M&M', 'HAL', 'BEL', 'IRFC', 'GRANULES', 'SHRIRAMFIN', 'TRENT', 'BEL', 'HDFCLIFE', 'SBILIFE'];
    const uniqueNifty50 = [...new Set(nifty50)];

    uniCov += `## NIFTY 50 Universe Coverage\n\n`;
    uniCov += `| Symbol | In DB | Has Financial | Has Factor | Has Feature |\n| --- | --- | --- | --- | --- |\n`;
    let n50present = 0;
    for (const sym of uniqueNifty50) {
      const inDB = await pool.query(`SELECT COUNT(*) as cnt FROM symbols WHERE UPPER(symbol) = $1 AND listing_status = 'Active'`, [sym]);
      const dbCount = inDB.rows[0].cnt;
      if (dbCount === 0) {
        uniCov += `| ${sym} | ❌ No | | | |\n`;
        continue;
      }
      n50present++;
      const hasFin = await pool.query(`SELECT COUNT(*) as cnt FROM financial_snapshots WHERE symbol = $1`, [sym]);
      const hasFac = await pool.query(`SELECT COUNT(*) as cnt FROM factor_snapshots WHERE symbol = $1`, [sym]);
      const hasFea = await pool.query(`SELECT COUNT(*) as cnt FROM feature_snapshots WHERE symbol = $1`, [sym]);
      uniCov += `| ${sym} | ✅ | ${hasFin.rows[0].cnt > 0 ? '✅' : '❌'} | ${hasFac.rows[0].cnt > 0 ? '✅' : '❌'} | ${hasFea.rows[0].cnt > 0 ? '✅' : '❌'} |\n`;
    }
    uniCov += `\n**NIFTY 50 Summary:** ${n50present}/${uniqueNifty50.length} symbols present (${(n50present/uniqueNifty50.length*100).toFixed(0)}%)\n`;

    // All active symbols with data summary
    uniCov += `\n## Total Universe Summary\n\n`;
    uniCov += `- Active symbols: ${totalActive}\n`;
    uniCov += `- With financial snapshots: ${(await pool.query(`SELECT COUNT(DISTINCT s.symbol) as cnt FROM symbols s WHERE s.listing_status = 'Active' AND EXISTS (SELECT 1 FROM financial_snapshots fs WHERE fs.symbol = s.symbol)`)).rows[0].cnt}\n`;
    uniCov += `- With factor snapshots: ${(await pool.query(`SELECT COUNT(DISTINCT s.symbol) as cnt FROM symbols s WHERE s.listing_status = 'Active' AND EXISTS (SELECT 1 FROM factor_snapshots f WHERE f.symbol = s.symbol)`)).rows[0].cnt}\n`;
    uniCov += `- With feature snapshots: ${(await pool.query(`SELECT COUNT(DISTINCT s.symbol) as cnt FROM symbols s WHERE s.listing_status = 'Active' AND EXISTS (SELECT 1 FROM feature_snapshots fe WHERE fe.symbol = s.symbol)`)).rows[0].cnt}\n`;
    uniCov += `- With ALL 3 snapshots: ${fullRes.rows[0].cnt}\n`;

    fs.writeFileSync(path.join(reportsDir, 'UniverseCoverage.md'), uniCov, 'utf8');
    console.log('  Done.');

    // ═══════════════════════════════════════════════════════════════
    // 6. DataIntegrityAudit.md
    // ═══════════════════════════════════════════════════════════════
    console.log('Writing DataIntegrityAudit.md...');

    let integ = `# Data Integrity Audit — TRACK-13A\n\n`;
    integ += `**Date:** ${runDate}\n\n`;

    // Orphan symbols (in snapshots but not in symbols table)
    integ += `## Orphan Records\n\n`;
    const tables2 = ['financial_snapshots', 'feature_snapshots', 'factor_snapshots', 'daily_prices'];
    integ += `| Table | Orphan Records | Affected Symbols |\n| --- | --- | --- |\n`;
    for (const table of tables2) {
      try {
        const res = await pool.query(`
          SELECT COUNT(*) as cnt, COUNT(DISTINCT t.symbol) as syms
          FROM ${table} t
          LEFT JOIN symbols s ON UPPER(t.symbol) = UPPER(s.symbol)
          WHERE s.symbol IS NULL
        `);
        integ += `| ${table} | ${res.rows[0].cnt} | ${res.rows[0].syms} |\n`;
      } catch (e) {
        integ += `| ${table} | ERROR | |\n`;
      }
    }

    // Duplicate snapshots
    integ += `\n## Duplicate Snapshots\n\n`;
    integ += `| Table | Duplicate Rows |\n| --- | --- |\n`;
    for (const [table, cols] of [
      ['financial_snapshots', 'symbol, period_end'],
      ['feature_snapshots', 'symbol, trade_date'],
      ['factor_snapshots', 'symbol, trade_date'],
      ['daily_prices', 'symbol, trade_date'],
    ]) {
      try {
        const res = await pool.query(`
          SELECT COUNT(*) as cnt FROM (
            SELECT ${cols}, COUNT(*) as cnt
            FROM ${table}
            GROUP BY ${cols}
            HAVING COUNT(*) > 1
          ) sub
        `);
        integ += `| ${table} | ${res.rows[0].cnt} |\n`;
      } catch (e) {
        integ += `| ${table} | ERROR |\n`;
      }
    }

    // Symbols with factors but no features
    integ += `\n## Cross-Table Completeness\n\n`;
    integ += `| Condition | Count |\n| --- | --- |\n`;
    
    const crossChecks = [
      ['Factors without financials', `EXISTS (SELECT 1 FROM factor_snapshots f WHERE f.symbol = s.symbol) AND NOT EXISTS (SELECT 1 FROM financial_snapshots fs WHERE fs.symbol = s.symbol)`],
      ['Features without financials', `EXISTS (SELECT 1 FROM feature_snapshots fe WHERE fe.symbol = s.symbol) AND NOT EXISTS (SELECT 1 FROM financial_snapshots fs WHERE fs.symbol = s.symbol)`],
      ['Factors without features', `EXISTS (SELECT 1 FROM factor_snapshots f WHERE f.symbol = s.symbol) AND NOT EXISTS (SELECT 1 FROM feature_snapshots fe WHERE fe.symbol = s.symbol)`],
      ['Features without factors', `EXISTS (SELECT 1 FROM feature_snapshots fe WHERE fe.symbol = s.symbol) AND NOT EXISTS (SELECT 1 FROM factor_snapshots f WHERE f.symbol = s.symbol)`],
    ];
    for (const [label, clause] of crossChecks) {
      const res = await pool.query(`SELECT COUNT(*) as cnt FROM symbols s WHERE s.listing_status = 'Active' AND (${clause})`);
      integ += `| ${label} | ${res.rows[0].cnt} |\n`;
    }

    // Financial data integrity: check for extreme outliers
    integ += `\n## Financial Data Integrity (Outlier Check)\n\n`;
    integ += `| Metric | Outlier Count | Min Value | Max Value |\n| --- | --- | --- | --- |\n`;
    const outlierChecks = [
      ['roe', '-5, 5'],
      ['roa', '-5, 5'],
      ['roic', '-5, 5'],
      ['pe_ratio', '-500, 1000'],
      ['debt_to_equity', '-10, 100'],
    ];
    for (const [metric, range] of outlierChecks) {
      const [lo, hi] = range.split(', ').map(Number);
      try {
        const res = await pool.query(`SELECT COUNT(*) as cnt FROM financial_snapshots WHERE ${metric} IS NOT NULL AND (${metric} < $1 OR ${metric} > $2)`, [lo, hi]);
        integ += `| ${metric} | ${res.rows[0].cnt} | ${lo} | ${hi} |\n`;
      } catch (e) {
        integ += `| ${metric} | ERROR | | |\n`;
      }
    }

    fs.writeFileSync(path.join(reportsDir, 'DataIntegrityAudit.md'), integ, 'utf8');
    console.log('  Done.');

    // ═══════════════════════════════════════════════════════════════
    // 7. FinalVerdict.md
    // ═══════════════════════════════════════════════════════════════
    console.log('Writing FinalVerdict.md...');

    let verd = `# Final Verdict — TRACK-13A Database Readiness\n\n`;
    verd += `**Date:** ${runDate}\n\n`;

    // Compile findings
    const fullCount = fullRes.rows[0].cnt;
    const readinessPct = (fullCount / totalActive * 100);
    const hasFactorFinOnly = (await pool.query(`SELECT COUNT(*) as cnt FROM symbols s WHERE s.listing_status = 'Active' AND EXISTS (SELECT 1 FROM financial_snapshots fs WHERE fs.symbol = s.symbol) AND EXISTS (SELECT 1 FROM factor_snapshots f WHERE f.symbol = s.symbol)`)).rows[0].cnt;

    // Check NIFTY 50 coverage completeness
    const nifty50FinCount = n50present;
    const nifty50Pct = (nifty50FinCount / uniqueNifty50.length * 100);

    verd += `## Executive Summary\n\n`;
    verd += `| Metric | Value | Threshold | Status |\n| --- | --- | --- | --- |\n`;
    verd += `| Active symbols | ${totalActive} | > 50 | ${totalActive >= 50 ? '✅' : '⚠️'} |\n`;
    verd += `| Symbols with full data (all 3 snapshots) | ${fullCount} | > 30 | ${fullCount >= 30 ? '✅' : '⚠️'} |\n`;
    verd += `| Symbols with financial + factor | ${hasFactorFinOnly} | > 50 | ${hasFactorFinOnly >= 50 ? '✅' : '⚠️'} |\n`;
    verd += `| NIFTY 50 coverage | ${nifty50FinCount}/${uniqueNifty50.length} (${nifty50Pct.toFixed(0)}%) | > 50% | ${nifty50Pct >= 50 ? '✅' : '⚠️'} |\n`;

    // Freshness check
    const maxFacDate = (await pool.query(`SELECT MAX(trade_date) as max_d FROM factor_snapshots`)).rows[0].max_d;
    const factorFreshnessDays = maxFacDate ? Math.floor((now - new Date(maxFacDate)) / (1000 * 60 * 60 * 24)) : Infinity;
    verd += `| Factor freshness | ${factorFreshnessDays}d old | < 30d | ${factorFreshnessDays <= 30 ? '✅' : '🔴'} |\n`;

    // ROA data
    const roaCount = (await pool.query(`SELECT COUNT(*) as cnt FROM financial_snapshots WHERE roa IS NOT NULL`)).rows[0].cnt;
    const roaPct = (roaCount / (await pool.query(`SELECT COUNT(*) as cnt FROM financial_snapshots`)).rows[0].cnt * 100);
    verd += `| ROA data populated | ${roaCount} rows (${roaPct.toFixed(1)}%) | > 10% | ${roaPct > 10 ? '✅' : '⚠️'} |\n`;

    // Duplicate check
    const dupCount = (await pool.query(`SELECT COUNT(*) as cnt FROM (SELECT symbol, trade_date, COUNT(*) as cnt FROM factor_snapshots GROUP BY symbol, trade_date HAVING COUNT(*) > 1) sub`)).rows[0].cnt;
    verd += `| Duplicate factor snapshots | ${dupCount} | 0 | ${dupCount === 0 ? '✅' : '⚠️'} |\n`;

    // Orphan check
    const orphanCount = (await pool.query(`SELECT COUNT(*) as cnt FROM factor_snapshots t LEFT JOIN symbols s ON UPPER(t.symbol) = UPPER(s.symbol) WHERE s.symbol IS NULL`)).rows[0].cnt;
    verd += `| Orphan factor records | ${orphanCount} | 0 | ${orphanCount === 0 ? '✅' : '⚠️'} |\n`;

    verd += `\n## TRACK-13 Calibration Readiness\n\n`;
    const issues = [];
    if (fullCount < 30) issues.push(`Only ${fullCount} stocks have complete data (target: 150+)`);
    if (nifty50Pct < 50) issues.push(`NIFTY 50 coverage is ${nifty50Pct.toFixed(0)}% — benchmark indices underrepresented`);
    if (factorFreshnessDays > 30) issues.push(`Factor snapshots are ${factorFreshnessDays}d old — stale data`);
    if (roaPct < 10) issues.push(`ROA data at ${roaPct.toFixed(1)}% coverage — TRACK-12 impact limited`);
    if (orphanCount > 0) issues.push(`${orphanCount} orphan records — data integrity concern`);

    if (issues.length === 0 && fullCount >= 50) {
      verd += `**VERDICT: ✅ READY** — Database has sufficient quality data for a trustworthy TRACK-13 calibration audit.\n\n`;
      verd += `The audit will run against **${fullCount} stocks** with complete snapshot data across all engines.\n`;
    } else {
      verd += `**VERDICT: ⚠️ PROCEED WITH CAVEATS**\n\n`;
      verd += `### Issues Found\n`;
      for (const issue of issues) {
        verd += `- ${issue}\n`;
      }
      verd += `\nTRACK-13 can proceed but results should note these limitation.\n`;
    }

    verd += `\n## TRACK-13 Statistical Trustworthiness\n\n`;
    verd += `- **Sample size:** ${fullCount} stocks (${hasFactorFinOnly} with financial + factor minimum)\n`;
    verd += `- **Statistical power:** ${fullCount >= 30 ? 'Sufficient for distribution analysis' : 'Marginally sufficient — results may have wider confidence intervals'}\n`;
    verd += `- **Sector representation:** ${(await pool.query(`SELECT COUNT(DISTINCT sector) as cnt FROM symbols WHERE listing_status = 'Active'`)).rows[0].cnt} distinct sectors\n`;
    verd += `- **Recommendation:** ${fullCount >= 30 ? 'TRACK-13 should produce statistically meaningful results' : 'TRACK-13 should be treated as indicative, not conclusive'}\n`;

    fs.writeFileSync(path.join(reportsDir, 'FinalVerdict.md'), verd, 'utf8');
    console.log('  Done.');

    console.log(`\n=== All 7 reports written to ${reportsDir} ===`);

    await pool.end();
  } catch (err) {
    console.error('Audit failed:', err.message);
    await pool.end().catch(() => {});
    process.exit(1);
  }
}

main();
