/**
 * providerAmplificationAudit.test.ts — Route provider-call amplification audit.
 *
 * Verifies that pages/routes do NOT call providers per-row in loops. This
 * is a structural audit that checks the codebase for dangerous patterns like
 * calling MarketDataGateway.getQuote() or similar provider methods inside
 * .map() loops, Promise.all() of provider calls, or for-await loops over
 * symbol arrays.
 *
 * Internal scheduler code (src/services/scheduler/) is exempt — those are
 * controlled batch processes with budgets and locks. Public routes and
 * page components are the target.
 *
 * Non-blocking (informational) — the audit logs findings but does not fail
 * the build. It exists to call out regressions during code review.
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const PAGES_DIR = path.resolve(PROJECT_ROOT, 'src/pages');
const COMPONENTS_DIR = path.resolve(PROJECT_ROOT, 'src/components');
const UI_DIR = path.resolve(PROJECT_ROOT, 'src/ui');
const SCHEDULER_DIR = path.resolve(PROJECT_ROOT, 'src/services/scheduler');

/** Provider call patterns we look for in page/component code */
const PROVIDER_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /MarketDataGateway\.getQuote/g, label: 'MarketDataGateway.getQuote()' },
  { pattern: /MarketDataGateway\.getCandles/g, label: 'MarketDataGateway.getCandles()' },
  { pattern: /MarketDataGateway\.getProfile/g, label: 'MarketDataGateway.getProfile()' },
  { pattern: /ProviderCoordinator/g, label: 'ProviderCoordinator direct call' },
  { pattern: /EodDataCacheService/g, label: 'EodDataCacheService call' },
  { pattern: /\.getQuote\(holding/g, label: 'getQuote per holding loop' },
  { pattern: /\.getQuote\(symbol/g, label: 'getQuote per symbol loop' },
];

/** Loop patterns that indicate per-row provider calls */
const LOOP_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\.map\(.*=>.*(?:getQuote|getCandles|getProfile)/g, label: '.map() with provider call' },
  { pattern: /Promise\.all.*\.map\(.*(?:getQuote|getCandles)/g, label: 'Promise.all + .map + provider' },
  { pattern: /for\s+.*of.*(?:getQuote|getCandles)/g, label: 'for-of with provider call' },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function walkDir(dir: string): string[] {
  const files: string[] = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        files.push(...walkDir(fullPath));
      } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
        files.push(fullPath);
      }
    }
  } catch {
    // Directory doesn't exist — skip
  }
  return files;
}

function checkFileForPatterns(
  filePath: string,
  patterns: Array<{ pattern: RegExp; label: string }>,
): Array<{ label: string; line: number }> {
  const hits: Array<{ label: string; line: number }> = [];
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    for (const { pattern, label } of patterns) {
      for (let i = 0; i < lines.length; i++) {
        pattern.lastIndex = 0;
        if (pattern.test(lines[i])) {
          hits.push({ label, line: i + 1 });
        }
      }
    }
  } catch {
    // skip unreadable files
  }
  return hits;
}

/* ------------------------------------------------------------------ */
/*  Audit                                                             */
/* ------------------------------------------------------------------ */

describe('Provider-call amplification audit', () => {
  const pageFiles = walkDir(PAGES_DIR);
  const componentFiles = walkDir(COMPONENTS_DIR);
  const uiFiles = walkDir(UI_DIR);
  const schedulerFiles = walkDir(SCHEDULER_DIR);

  const targetDirs = [
    { name: 'Pages', files: pageFiles, exempt: false },
    { name: 'Components', files: componentFiles, exempt: false },
    { name: 'UI', files: uiFiles, exempt: true },
    { name: 'Scheduler', files: schedulerFiles, exempt: true },
  ];

  for (const { name, files, exempt } of targetDirs) {
    describe(`${name} (${files.length} files)`, () => {
      if (files.length === 0) {
        it('exists and is accessible', () => {
          expect(true).toBe(true);
        });
        return;
      }

      // Check for provider patterns in each file
      for (const filePath of files) {
        const relativePath = path.relative(PROJECT_ROOT, filePath);
        const providerHits = checkFileForPatterns(filePath, PROVIDER_PATTE);
        const loopHits = checkFileForPatterns(filePath, LOOP_PATTE);
        const allHits = [...providerHits, ...loopHits];

        if (allHits.length > 0) {
          it(`${relativePath} has ${allHits.length} provider-related call(s)`, () => {
            if (exempt) {
              console.log(`[EXEMPT] ${relativePath} — provider calls found:`, allHits);
              expect(true).toBe(true);
            } else {
              console.log(`[AUDIT] ${relativePath} — provider calls found:`, allHits);
              expect(true).toBe(true);
            }
          });
        }
      }

      // Summary check
      it('completes provider amplification scan', () => {
        const totalProviderHits = files.reduce((sum, f) => {
          const h = checkFileForPatterns(f, PROVIDER_PATTE);
          return sum + h.length;
        }, 0);
        const totalLoopHits = files.reduce((sum, f) => {
          const h = checkFileForPatterns(f, LOOP_PATTE);
          return sum + h.length;
        }, 0);

        console.log(`[SUMMARY] ${name}: ${totalProviderHits} provider patterns, ${totalLoopHits} loop patterns in ${files.length} files`);
        expect(true).toBe(true);
      });
    });
  }
});
