import { IndianApiPremiumConfig } from '../src/backend/integrations/indianapi/IndianApiPremiumConfig';
import { SUPER_SCAN_DEFINITIONS, SuperScanService } from '../src/backend/services/scanner/SuperScanService';
import type { StockIntelligenceSnapshot } from '../src/shared/intelligence/IndianApiPremiumTypes';

async function main(): Promise<void> {
  const config = IndianApiPremiumConfig.getInstance();
  const summary = config.getSummary();

  console.log('Super Scans');
  console.log('──────────────────────────────────────');

  if (!summary.enabled || !summary.scanEnabled) {
    console.log('Scans: DISABLED');
    console.log('Set INDIANAPI_PREMIUM_ENABLED=true and INDIANAPI_PREMIUM_SCAN_ENABLED=true.');
    process.exit(0);
  }

  // Try loading from DB
  let snapshots: StockIntelligenceSnapshot[] = [];
  try {
    const { dbAdapter } = await import('../src/db/DatabaseAdapter');
    const result = await dbAdapter.query('SELECT * FROM stock_live_snapshot WHERE source_state != $1 ORDER BY completeness_score DESC LIMIT 200', ['error']);
    if (result.rows?.length) {
      snapshots = result.rows.map((r: any) => ({
        symbol: r.symbol,
        companyName: r.company_name,
        asOf: r.as_of || r.updated_at,
        price: r.price,
        changePercent: r.change_percent,
        peRatio: r.pe_ratio,
        pbRatio: r.pb_ratio,
        marketCap: r.market_cap,
        roe: r.roe,
        roce: r.roce,
        debtToEquity: r.debt_to_equity,
        revenueGrowth: r.revenue_growth,
        profitGrowth: r.profit_growth,
        operatingMargin: r.operating_margin,
        netMargin: r.net_margin,
        promoterHolding: r.promoter_holding,
        fiiHolding: r.fii_holding,
        diiHolding: r.dii_holding,
        analystView: r.analyst_view || 'not_available',
        analystViewRaw: r.analyst_view_raw,
        externalTargetPrice: r.external_target_price,
        externalUpsidePercent: r.external_upside_percent,
        latestHeadline: r.latest_headline,
        latestHeadlineUrl: r.latest_headline_url,
        sourceState: r.source_state || 'missing',
        completenessScore: r.completeness_score || 0,
        updatedAt: r.updated_at,
      }));
    }
  } catch {
    console.log('DB: UNAVAILABLE — cannot run scans without data');
    process.exit(0);
  }

  if (snapshots.length === 0) {
    console.log('No snapshots available. Run ingestion first.');
    console.log('  npm run indianapi:premium:ingest -- --symbols=RELIANCE,ITC,TCS --write');
    process.exit(0);
  }

  console.log(`Loaded ${snapshots.length} snapshots from DB\n`);

  const scanSvc = new SuperScanService();
  for (const def of SUPER_SCAN_DEFINITIONS) {
    const results = scanSvc.runScan(def.key, snapshots);
    console.log(`${def.label} (${def.key}): ${results.length} results`);
    for (const r of results.slice(0, 5)) {
      console.log(`  #${results.indexOf(r) + 1} ${r.symbol} score=${r.score} reason="${r.reason}"`);
    }
    if (results.length > 5) console.log(`  ... and ${results.length - 5} more`);
    console.log('');
  }
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
