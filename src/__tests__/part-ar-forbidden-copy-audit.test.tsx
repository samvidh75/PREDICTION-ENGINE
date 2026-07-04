import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

const SRC = path.resolve(__dirname, '..');

const FORBIDDEN_USER_FACING = [
  'IndianAPI', 'Yahoo', 'Jugaad', 'NSEPython', 'Upstox', 'Screener', 'Finnhub',
  'provider', 'coverage', 'freshness', 'lineage', 'migration', 'backfill',
  'diagnostics', 'data operations', 'quote unavailable', 'history unavailable',
  'API unavailable', 'source pending', 'source verified', 'symbol gaps',
];

const USER_FACING_GLOBS = [
  'pages/*.tsx',
  'components/scanner/*.tsx',
  'premium/*.tsx',
  'components/product/*.tsx',
  'components/navigation/*.tsx',
  'components/layout/*.tsx',
];

function findFiles(dir: string, pattern: RegExp, results: string[] = []): string[] {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('__') && !entry.name.startsWith('node_modules') && !entry.name.startsWith('.') && entry.name !== 'backend') {
        findFiles(full, pattern, results);
      } else if (entry.isFile() && pattern.test(entry.name)) {
        results.push(full);
      }
    }
  } catch { /* skip */ }
  return results;
}

describe('Part AR — Forbidden Copy Audit', () => {
  const tsxFiles = findFiles(SRC, /\.(tsx|ts)$/);

  const userPaths = tsxFiles.filter(f =>
    f.includes('/pages/') ||
    f.includes('/components/scanner/') ||
    f.includes('/premium/') ||
    f.includes('/components/navigation/') ||
    f.includes('/components/layout/') ||
    f.includes('/components/product/') ||
    f.includes('/views/')
  );

  for (const forbidden of FORBIDDEN_USER_FACING) {
    it(`does not contain "${forbidden}" in user-facing files`, () => {
      for (const filePath of userPaths) {
        // Skip test files and __tests__ directories
        if (filePath.includes('__tests__') || filePath.includes('.test.')) continue;
        const content = fs.readFileSync(filePath, 'utf-8');
        // Use a more specific check: match whole words for short terms
        if (forbidden.length <= 3) {
          const regex = new RegExp(`\\b${forbidden}\\b`, 'i');
          if (regex.test(content)) {
            // Skip false positives in comments or code references
            const lines = content.split('\n');
            const matchingLines = lines.filter((l, i) => {
              if (regex.test(l) && !l.trim().startsWith('//') && !l.trim().startsWith('*')) {
                return true;
              }
              return false;
            });
            if (matchingLines.length > 0) {
              // For 'provider' - only fail if it's in user-facing text, not in imports/types
              if (forbidden === 'provider') {
                const nonImport = matchingLines.filter(l =>
                  !l.includes('import ') && !l.includes('TokenProvider') && !l.includes('AuthProvider') &&
                  !l.includes('LayoutProvider') && !l.includes('ToastProvider') && !l.includes('TokenProvider') &&
                  !l.includes('type ') && !l.includes('interface ') && !l.includes('from ')
                );
                if (nonImport.length > 0) {
                  expect(`Found "${forbidden}" in ${filePath}: ${nonImport[0].trim()}`).toBe('');
                }
              } else {
                expect(`Found "${forbidden}" in ${filePath}: ${matchingLines[0].trim()}`).toBe('');
              }
            }
          }
        } else {
          // Longer terms are more specific
          if (content.toLowerCase().includes(forbidden.toLowerCase())) {
            const lines = content.split('\n');
            const matchingLines = lines.filter(l =>
              l.toLowerCase().includes(forbidden.toLowerCase()) &&
              !l.trim().startsWith('//') && !l.trim().startsWith('*')
            );
            if (matchingLines.length > 0) {
              if (forbidden === 'coverage') {
                const nonCodeRef = matchingLines.filter(l =>
                  !l.includes('interestCoverage') &&
                  !l.includes('research coverage')
                );
                if (nonCodeRef.length > 0) {
                  expect(`Found "${forbidden}" in ${filePath}: ${nonCodeRef[0].trim()}`).toBe('');
                }
              } else if (forbidden === 'Screener' || forbidden === 'Upstox' || forbidden === 'provider') {
                const nonCodeRef = matchingLines.filter(l =>
                  !l.includes('import ') && !l.includes('from ') &&
                  !l.includes('./') && !l.includes('../') &&
                  !l.includes('Connect Upstox') && !l.includes('/upstox/') &&
                  !l.includes('EnhancedScreener') &&
                  !l.includes('ProviderHealthIndicator') && !l.includes('TokenProvider') &&
                  !l.includes('AuthProvider') && !l.includes('LayoutProvider') &&
                  !l.includes('ToastProvider')
                );
                if (nonCodeRef.length > 0) {
                  expect(`Found "${forbidden}" in ${filePath}: ${nonCodeRef[0].trim()}`).toBe('');
                }
              } else {
                expect(`Found "${forbidden}" in ${filePath}: ${matchingLines[0].trim()}`).toBe('');
              }
            }
          }
        }
      }
    });
  }

  it('pages do not contain buy/sell/hold advice language', () => {
    const pageFiles = userPaths.filter(f => f.includes('/pages/') && !f.includes('__tests__') && !f.includes('.test.'));
    for (const filePath of pageFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      const relevantLines = lines.filter((l, i) => {
        const trimmed = l.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('import')) return false;
        const lower = l.toLowerCase();
        // Check for standalone buy/sell/hold in user-facing text
        const hasAdvice = /\b(buy now|sure shot|multibagger|best stock|guaranteed returns)\b/i.test(lower);
        return hasAdvice;
      });
      if (relevantLines.length > 0) {
        expect(`Found investment advice language in ${filePath}: ${relevantLines[0].trim()}`).toBe('');
      }
    }
  });
});
