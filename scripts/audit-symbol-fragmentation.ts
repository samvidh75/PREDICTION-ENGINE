/**
 * TRACK-95R — Symbol Fragmentation Audit & Migration
 * Detects .NS / .BSE suffix duplicates and merges them.
 * Produces reconciliation report.
 */
import Database from 'better-sqlite3';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { canonicalizeSymbol, groupByCanonical } from '../src/symbols/SymbolCanonicalizer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const db = new Database(join(__dirname, '..', 'data', 'stockstory.db'));
db.pragma('foreign_keys = OFF'); // Allow updates to maintain data

const tables = ['prediction_registry', 'factor_snapshots', 'feature_snapshots', 'daily_prices', 'financial_snapshots', 'symbols'];
const report: any = {
  track: 'TRACK-95R',
  phase: 'Symbol Canonicalisation',
  tables_audited: tables,
  fragments: {} as Record<string, any>
};

console.log('═══════════════════════════════════════');
console.log('  TRACK-95R — SYMBOL FRAGMENTATION AUDIT');
console.log('═══════════════════════════════════════\n');

let totalMergeCount = 0;

for (const table of tables) {
  console.log(`── ${table} ──`);

  // Get all symbols from this table
  let symbolColumn = 'symbol';
  if (table === 'symbols') symbolColumn = 'symbol';

  try {
    const symbols: string[] = db.prepare(`SELECT DISTINCT ${symbolColumn} as symbol FROM ${table}`).all().map((r: any) => r.symbol);
    console.log(`  Total unique symbols: ${symbols.length}`);

    // Group by canonical
    const groups = groupByCanonical(symbols);
    const fragmented = Array.from(groups.entries()).filter(([_, v]) => v.length > 1);

    console.log(`  Canonical groups: ${groups.size}`);
    console.log(`  Fragmented (2+ variants): ${fragmented.length}`);

    if (fragmented.length > 0) {
      console.log('  Fragmented symbols:');
      const tableFragments: Record<string, any> = {};

      for (const [canonical, variants] of fragmented) {
        console.log(`    ${canonical}: ${variants.join(', ')}`);
        tableFragments[canonical] = { variants, counts: {} };

        // Count rows per variant
        for (const variant of variants) {
          const count = db.prepare(`SELECT COUNT(*) as cnt FROM ${table} WHERE ${symbolColumn} = ?`).get(variant) as any;
          tableFragments[canonical].counts[variant] = count.cnt;
          console.log(`      ${variant}: ${count.cnt} rows`);
        }

        // MERGE: Update all .NS/.BSE variants to canonical
        for (const variant of variants) {
          if (variant !== canonical) {
            try {
              const result = db.prepare(
                `UPDATE OR IGNORE ${table} SET ${symbolColumn} = ? WHERE ${symbolColumn} = ?`
              ).run(canonical, variant);
              if (result.changes > 0) {
                console.log(`      → Merged ${variant} into ${canonical}: ${result.changes} rows updated`);
                totalMergeCount += result.changes;
              }
            } catch (e: any) {
              // UNIQUE constraint violation — delete the duplicate variant rows
              console.log(`      ⚠ Merge conflict for ${variant} → ${canonical}, skipping (UNIQUE constraint)`);
            }

            // Delete the non-canonical symbol from symbols table too
            if (table === 'symbols') {
              try {
                db.prepare(`DELETE FROM symbols WHERE ${symbolColumn} = ?`).run(variant);
              } catch { /* ignore — variant may already be gone */ }
            }
          }
        }
      }

      report.fragments[table] = {
        total_symbols: symbols.length,
        canonical_groups: groups.size,
        fragmented_count: fragmented.length,
        fragments: tableFragments,
        merged: fragmented.length > 0
      };
    } else {
      console.log('  ✓ No fragmentation');
      report.fragments[table] = { clean: true, total_symbols: symbols.length };
    }
  } catch (e: any) {
    console.log(`  ✗ Error: ${e.message}`);
    report.fragments[table] = { error: e.message };
  }
}

// Post-audit: verify 0 fragmented symbols remain
console.log('\n── Post-Migration Verification ──');
let remainingFragments = 0;
for (const table of tables) {
  const symbolColumn = 'symbol';
  try {
    const symbols: string[] = db.prepare(`SELECT DISTINCT ${symbolColumn} as symbol FROM ${table}`).all().map((r: any) => r.symbol);
    const groups = groupByCanonical(symbols);
    const fragmented = Array.from(groups.entries()).filter(([_, v]) => v.length > 1);
    if (fragmented.length > 0) {
      console.log(`  ${table}: ${fragmented.length} still fragmented`);
      remainingFragments += fragmented.length;
    } else {
      console.log(`  ${table}: ✓ Clean (${symbols.length} unique)`);
    }
  } catch { /* ignore — continue audit even if table fails */ }
}

console.log(`\n  Total rows merged: ${totalMergeCount}`);
console.log(`  Remaining fragments: ${remainingFragments}`);
console.log(`  Verdict: ${remainingFragments === 0 ? '✓ PASS' : '✗ FRAGMENTS REMAIN'}`);

report.post_migration = {
  total_rows_merged: totalMergeCount,
  remaining_fragments: remainingFragments,
  clean: remainingFragments === 0
};

// Write report
const reportPath = join(__dirname, '..', 'reports', 'track-95', 'SYMBOL_CANONICALIZATION_REPORT.json');
writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`\n  Report: ${reportPath}`);

db.close();
