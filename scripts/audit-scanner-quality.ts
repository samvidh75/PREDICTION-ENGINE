/**
 * audit-scanner-quality.ts — Verifies scanner quality (dedup, null scores, empty state).
 * Run: npx tsx scripts/audit-scanner-quality.ts
 */

export {};
const BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";

async function main() {
  console.log("Scanner Quality Audit");
  console.log("─────────────────────\n");

  const presets = [
    "Quality%20compounders",
    "Low%20debt%20leaders",
    "Risk%20rising",
    "Undervalued%20quality",
    "Improving%20momentum",
  ];

  let passed = 0;
  let failed = 0;

  for (const preset of presets) {
    const presetName = decodeURIComponent(preset);
    try {
      const res = await fetch(
        `${BASE_URL}/api/research/scanner?preset=${preset}&limit=20`,
        { signal: AbortSignal.timeout(15000) }
      );
      const data = await res.json();
      const results = data.data || [];

      const symbols = results.map((r: any) => r.symbol);
      const unique = new Set(symbols);
      const hasDuplicates = unique.size !== symbols.length;
      const nullScores = results.filter((r: any) => r.score === null);
      const pendingResults = results.filter((r: any) => {
        const c = (r.conviction || "").toLowerCase();
        const k = (r.keyReason || "").toLowerCase();
        return c.includes("pending") || k.includes("pending");
      });
      const itcCount = symbols.filter((s: string) => s === "ITC").length;

      const errors: string[] = [];
      if (hasDuplicates) errors.push("duplicate symbols found");
      if (nullScores.length > 0) errors.push(`${nullScores.length} null-score rows`);
      if (pendingResults.length > 0) errors.push(`${pendingResults.length} pending rows`);
      if (itcCount > 1) errors.push(`ITC appears ${itcCount} times`);

      if (errors.length === 0) {
        console.log(`  ✓ "${presetName}" — ${results.length} results, all clean`);
        passed++;
      } else {
        console.log(`  ✗ "${presetName}" — ${errors.join(", ")}`);
        console.log(`     Symbols: ${symbols.join(", ")}`);
        failed++;
      }
    } catch (err: any) {
      console.log(`  ✗ "${presetName}" — ${err.message}`);
      failed++;
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
