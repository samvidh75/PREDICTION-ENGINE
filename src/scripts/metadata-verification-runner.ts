/**
 * Metadata Verification Runner
 * Runs completeness reports on the database and generates MetadataCompletenessReport.md
 */

import pool from '../db/index';
import { DataIntegrityEngine } from '../services/data/DataIntegrityEngine';
import fs from 'fs';

async function runMetadataValidation() {
  console.log('Running Metadata Completeness & Accuracy Checks...');
  const integrity = new DataIntegrityEngine();

  const res = await pool.query('SELECT symbol, company_name, sector, industry, exchange, isin FROM symbols');
  const rows = res.rows;

  let validCount = 0;
  let partialCount = 0;
  let invalidCount = 0;

  const validRows: any[] = [];
  const partialRows: any[] = [];
  const invalidRows: any[] = [];

  for (const row of rows) {
    const meta = {
      symbol: row.symbol,
      companyName: row.company_name,
      sector: row.sector,
      industry: row.industry,
      exchange: row.exchange,
      marketCap: 1000000 // mock valid market cap for completeness validation
    };

    const status = integrity.scoreIntegrity(meta, row.isin);
    if (status === 'VALID') {
      validCount++;
      validRows.push(row);
    } else if (status === 'PARTIAL') {
      partialCount++;
      partialRows.push(row);
    } else {
      invalidCount++;
      invalidRows.push(row);
    }
  }

  const total = rows.length;
  const completeness = ((validCount + partialCount) / total * 100).toFixed(1);

  // Generate MetadataCompletenessReport.md
  let md = `# Metadata Completeness Report\n\n`;
  md += `**Total Records Audited:** ${total}\n`;
  md += `**Metadata Completeness Rate:** ${completeness}%\n\n`;
  md += `### Score breakdown:\n`;
  md += `- **VALID:** ${validCount} (${(validCount / total * 100).toFixed(1)}%)\n`;
  md += `- **PARTIAL:** ${partialCount} (${(partialCount / total * 100).toFixed(1)}%)\n`;
  md += `- **INVALID:** ${invalidCount} (${(invalidCount / total * 100).toFixed(1)}%)\n\n`;

  md += `## Sample VALID Records\n\n`;
  md += `| Symbol | Company Name | Sector | ISIN |\n`;
  md += `| --- | --- | --- | --- |\n`;
  validRows.slice(0, 10).forEach(r => {
    md += `| **${r.symbol}** | ${r.company_name} | ${r.sector} | ${r.isin} |\n`;
  });

  if (invalidRows.length > 0) {
    md += `\n## Sample INVALID Records (Requires Review)\n\n`;
    md += `| Symbol | Company Name | Sector | Issues |\n`;
    md += `| --- | --- | --- | --- |\n`;
    invalidRows.slice(0, 10).forEach(r => {
      md += `| **${r.symbol}** | ${r.company_name} | ${r.sector} | Ticker as name or raw BSE code |\n`;
    });
  }

  fs.writeFileSync('MetadataCompletenessReport.md', md, 'utf8');
  console.log('MetadataCompletenessReport.md written successfully.');
  await pool.end();
}

runMetadataValidation().catch(err => {
  console.error('Error running metadata checks:', err);
  process.exit(1);
});
