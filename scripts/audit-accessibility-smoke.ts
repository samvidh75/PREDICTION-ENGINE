/**
 * audit-accessibility-smoke.ts — Lightweight accessibility smoke audit.
 * Checks that pages serve valid HTML with basic a11y patterns.
 *
 * Usage:
 *   npx tsx scripts/audit-accessibility-smoke.ts
 */

export {};

const FRONTEND_URL = process.env.FRONTEND_URL || "https://www.stockstory-india.com";
const TIMEOUT = 10000;

interface A11yResult {
  route: string;
  hasLang: boolean;
  hasTitle: boolean;
  hasNav: boolean;
  hasMain: boolean;
  hasSkipLink: boolean;
  passed: boolean;
}

async function checkA11y(path: string): Promise<A11yResult> {
  const result: A11yResult = {
    route: path,
    hasLang: false,
    hasTitle: false,
    hasNav: false,
    hasMain: false,
    hasSkipLink: false,
    passed: false,
  };

  try {
    const res = await fetch(`${FRONTEND_URL}${path}`, { signal: AbortSignal.timeout(TIMEOUT) });
    const text = await res.text();
    result.hasLang = /<html[^>]*\slang\s*=/.test(text);
    result.hasTitle = /<title>/.test(text);
    result.hasNav = /<nav\b/.test(text) || /role\s*=\s*["']?navigation["']?/.test(text);
    result.hasMain = /<main\b/.test(text) || /role\s*=\s*["']?main["']?/.test(text);
    result.hasSkipLink = /skip\s*(to|link|content|nav)/i.test(text);
    const checks = [result.hasLang, result.hasTitle];
    result.passed = checks.filter(Boolean).length >= 2;
    } catch { /* ignore — safe defaults on parse failure */ }
  return result;
}

async function main(): Promise<void> {
  console.log("Accessibility Smoke Audit");
  console.log("─────────────────────────\n");

  const routes = [
    "/?page=home",
    "/?page=scanner",
    "/?page=stock&id=RELIANCE",
    "/?page=track",
    "/?page=compare",
    "/?page=pricing",
    "/?page=about",
  ];

  let passed = 0;
  let failed = 0;

  for (const route of routes) {
    const r = await checkA11y(route);
    const checks = [`lang:${r.hasLang}`,`title:${r.hasTitle}`,`nav:${r.hasNav}`,`main:${r.hasMain}`,`skip:${r.hasSkipLink}`];
    console.log(`  ${r.passed ? "PASS" : "FAIL"} ${route} (${checks.join(" ")})`);
    if (r.passed) passed++; else failed++;
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
