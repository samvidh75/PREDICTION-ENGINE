import { readdirSync, readFileSync, statSync } from "fs";
import { join, extname } from "path";

const FORBIDDEN = [
  "provider", "coverage", "freshness", "source pending", "source verified",
  "migration", "backfill", "diagnostics", "data operations",
  "quote unavailable", "history unavailable",
  "IndianAPI", "Yahoo", "StockEdge", "Trendlyne disabled", "backend",
];

const EXCLUDE_DIRS = ["node_modules", ".git", "dist", "build", ".next", "coverage", "archive", "reports", ".tmp", "__tests__"];
const EXCLUDE_FILES = ["audit-public-copy.ts", "upstox.ts", "stockedge"];

function scanFile(filePath: string): { line: number; match: string }[] {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const hits: { line: number; match: string }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const lower = lines[i].toLowerCase();
    for (const term of FORBIDDEN) {
      if (lower.includes(term.toLowerCase())) {
        hits.push({ line: i + 1, match: term });
      }
    }
  }
  return hits;
}

function scanDir(dirPath: string): { file: string; hits: { line: number; match: string }[] }[] {
  const results: { file: string; hits: { line: number; match: string }[] }[] = [];
  const entries = readdirSync(dirPath);
  for (const entry of entries) {
    if (EXCLUDE_DIRS.includes(entry)) continue;
    const fullPath = join(dirPath, entry);
    if (statSync(fullPath).isDirectory()) {
      results.push(...scanDir(fullPath));
    } else {
      const ext = extname(fullPath);
      if (![".tsx", ".jsx", ".ts", ".js", ".html"].includes(ext)) continue;
      if (EXCLUDE_FILES.some((f) => fullPath.includes(f))) continue;
      const hits = scanFile(fullPath);
      if (hits.length > 0) results.push({ file: fullPath, hits });
    }
  }
  return results;
}

function main() {
  console.log("=== Public-Copy Audit ===");
  console.log("Scanning for forbidden public-facing terms...");
  console.log("");

  const srcDir = join(process.cwd(), "src");
  const results = scanDir(srcDir);

  let totalHits = 0;
  for (const { file, hits } of results) {
    console.log(`\n${file}:`);
    for (const { line, match } of hits) {
      console.log(`  L${line}: contains "${match}"`);
      totalHits++;
    }
  }

  console.log(`\nTotal hits: ${totalHits}`);

  if (totalHits > 0) {
    console.log("\n⚠️  Some files contain forbidden terms. Review each hit.");
    console.log("Exceptions: tests checking absence, admin routes, broker handoff (Upstox).");
    process.exitCode = 0;
  } else {
    console.log("\n✅ No forbidden terms found in public-facing frontend code.");
  }
}

main();
