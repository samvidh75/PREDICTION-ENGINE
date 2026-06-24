/**
 * Provider Accuracy Validation Runner
 * Reconciles quotes and outputs ProviderAccuracyReport.md.
 */

import { ProviderValidation } from '../services/providers/ProviderValidation';
import * as fs from 'fs';

const SYMBOLS = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'SBIN'];

async function runReconciliation() {
  console.info('Reconciling quotes for ProviderAccuracyReport.md...');
  const results = await ProviderValidation.reconcileQuotes(SYMBOLS);
  const report = ProviderValidation.generateReport(results);
  fs.writeFileSync('ProviderAccuracyReport.md', report, 'utf8');
  console.info('ProviderAccuracyReport.md written successfully.');
}

runReconciliation().catch(err => {
  console.error('Error in reconciliation:', err);
  process.exit(1);
});
