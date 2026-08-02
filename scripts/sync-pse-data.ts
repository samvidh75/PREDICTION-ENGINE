/**
 * PSE Market Data Sync Script
 * Syncs PSE stock universe, prices, and fundamentals to the database
 * Run: npx tsx scripts/sync-pse-data.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface PseStock {
  symbol: string;
  name: string;
  sector: string;
}

interface PseUniverse {
  metadata: { total: number };
  sectors: Record<string, string[]>;
  stocks: PseStock[];
}

async function syncPseUniverse() {
  console.log('🔃 Syncing PSE Stock Universe...');

  const universePath = path.join(__dirname, 'pse-universe.json');
  const universe: PseUniverse = JSON.parse(fs.readFileSync(universePath, 'utf-8'));

  console.log(`  📊 ${universe.metadata.total} PSE stocks loaded`);

  const sectors = Object.keys(universe.sectors);
  console.log(`  🏭 ${sectors.length} sectors: ${sectors.join(', ')}`);

  // Write the symbol list for the app to use
  const symbols = universe.stocks.map(s => s.symbol);
  const symbolsPath = path.join(__dirname, '..', 'data', 'pse-symbols.json');
  fs.writeFileSync(symbolsPath, JSON.stringify(symbols, null, 2));
  console.log(`  💾 Symbols written to data/pse-symbols.json`);

  // Write the full universe
  const universeDataPath = path.join(__dirname, '..', 'data', 'pse-universe.json');
  fs.writeFileSync(universeDataPath, JSON.stringify(universe, null, 2));
  console.log(`  💾 Full universe written to data/pse-universe.json`);

  console.log('✅ PSE universe sync complete!');
}

async function fetchPsePrices() {
  console.log('\n🔃 Fetching PSE live prices from PHISIX...');
  try {
    const response = await fetch('https://phisix-api3.appspot.com/stocks.json');
    const data = await response.json();
    const stocks = data.stock || [];

    const prices: Record<string, { price: number; change: number; changePercent: number; volume: number }> = {};
    for (const s of stocks) {
      prices[s.symbol] = {
        price: s.price.amount,
        change: s.price.amount - s.previous_close,
        changePercent: s.percent_change,
        volume: s.volume,
      };
    }

    const pricesPath = path.join(__dirname, '..', 'data', 'pse-live-prices.json');
    fs.writeFileSync(pricesPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      count: stocks.length,
      prices,
    }, null, 2));

    console.log(`  💾 ${stocks.length} prices saved to data/pse-live-prices.json`);
    console.log('✅ PSE prices fetched!');
  } catch (e) {
    console.error('  ❌ Failed to fetch PHISIX data:', e);
  }
}

async function generatePseIndex() {
  console.log('\n🔃 Generating PSE index components...');

  const universePath = path.join(__dirname, 'pse-universe.json');
  const universe: PseUniverse = JSON.parse(fs.readFileSync(universePath, 'utf-8'));

  // Top 30 PSE stocks by market cap (approximate - manually curated)
  const pseiComponents = [
    'AC', 'ALI', 'AP', 'AEV', 'AGI', 'BDO', 'BLOOM', 'BPI', 'CEB', 'CNPF',
    'DMC', 'FGEN', 'FMETF', 'FPI', 'GLO', 'GTCAP', 'ICT', 'IMI', 'JFC', 'JGS',
    'LTG', 'MBT', 'MEG', 'MER', 'MONDE', 'MPI', 'MWIDE', 'NIKL', 'PCOR',
    'PGOLD', 'PNB', 'PSE', 'RCB', 'RLC', 'RRHI', 'SCC', 'SECB', 'SM',
    'SMC', 'SMPH', 'SPC', 'SSI', 'TEL', 'UBP', 'URC', 'VLL', 'WLCON',
  ];

  const indexPath = path.join(__dirname, '..', 'data', 'pse-index-components.json');
  fs.writeFileSync(indexPath, JSON.stringify({
    index: 'PSEi',
    name: 'PSE Composite Index',
    components: pseiComponents,
    count: pseiComponents.length,
  }, null, 2));

  console.log(`  📈 PSEi has ${pseiComponents.length} component stocks`);
  console.log('✅ PSE index generated!');
}

async function main() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║  StockEX PSE Data Sync               ║');
  console.log('╚══════════════════════════════════════╝\n');

  await syncPseUniverse();
  await generatePseIndex();
  await fetchPsePrices();

  console.log('\n🎉 PSE data sync complete!');
}

main().catch(console.error);
