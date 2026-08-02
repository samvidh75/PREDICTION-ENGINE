/**
 * audit-responsive-ui.ts — Lightweight responsive UI audit.
 * Checks for basic responsive layout issues.
 *
 * Usage:
 *   npx tsx scripts/audit-responsive-ui.ts
 */

export {};

const FRONTEND_URL = process.env.FRONTEND_URL || "https://www.stockstory-india.com";
const TIMEOUT = 10000;

async function checkRoute(path: string): Promise<boolean> {
  try {
    const res = await fetch(`${FRONTEND_URL}${path}`, { signal: AbortSignal.timeout(TIMEOUT) });
    if (!res.ok) { console.log(`  FAIL ${path} — HTTP ${res.status}`); return false; }
    const text = await res.text();
    const hasOverflow = text.includes("overflow-x") && !text.includes("overflow-x: hidden");
    if (hasOverflow) console.log(`  WARN ${path} — possible horizontal overflow`);
    else console.log(`  PASS ${path}`);
    return true;
  } catch (err: any) {
    console.log(`  FAIL ${path} — ${err.message}`);
    return false;
  }
}

async function main(): Promise<void> {
  console.log("Responsive UI Audit");
  console.log("───────────────────\n");

  const routes = [
    "/?page=home",
    "/?page=scanner",
    "/?page=stock&id=RELIANCE",
    "/?page=track",
    "/?page=compare",
    "/?page=pricing",
    "/?page=about",
    "/?page=methodology",
  ];

  let passed = 0;
  let failed = 0;

  for (const route of routes) {
    if (await checkRoute(route)) passed++; else failed++;
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
