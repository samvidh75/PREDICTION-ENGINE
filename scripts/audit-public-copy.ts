/**
 * audit-public-copy.ts — Scans frontend source for forbidden public-facing terms.
 *
 * Usage:
 *   npx tsx scripts/audit-public-copy.ts
 */

import fs from 'node:fs';
import path from 'node:path';

const FRONTEND_DIRS = [
  'src/components',
  'src/pages',
  'src/lib',
  'src/hooks',
  'src/views',
];

const FORBIDDEN_TERMS: { pattern: RegExp; context?: string }[] = [
  { pattern: /\bprovider\b(?![.\s]*Provider|[.\s]*value)/i, context: 'public UI - use "source" or omit' },
  { pattern: /\bcoverage\b/i, context: 'public UI - use "research available" or omit' },
  { pattern: /\bfreshness\b/i, context: 'public UI - data quality term' },
  { pattern: /\bsource pending\b/i, context: 'public UI - use "being prepared"' },
  { pattern: /\bsource verified\b/i, context: 'public UI' },
  { pattern: /\bmigration\b/i, context: 'public UI - internal term' },
  { pattern: /\bbackfill\b/i, context: 'public UI - internal term' },
  { pattern: /\bdiagnostics\b/i, context: 'public UI - use "system status" or omit' },
  { pattern: /\bdata operations\b/i, context: 'public UI' },
  { pattern: /\bquote unavailable\b/i, context: 'public UI - use "price not available"' },
  { pattern: /\bhistory unavailable\b/i, context: 'public UI' },
  { pattern: /\bIndianAPI\b/i, context: 'public UI - never expose provider name' },
  { pattern: /\bYahoo\b/i, context: 'public UI - never expose provider name' },
  { pattern: /\bJugaad\b/i, context: 'public UI - never expose internal project name' },
  { pattern: /\bNSEPython\b/i, context: 'public UI - never expose provider name' },
  { pattern: /\bStockEdge\b/i, context: 'public UI - never expose provider name' },
  { pattern: /\bbackend\b/i, context: 'public UI - never use "backend"' },
  { pattern: /\bTrendlyne disabled\b/i, context: 'public UI - never show disabled state' },
  { pattern: /\bdata pipeline\b/i, context: 'public UI' },
  { pattern: /\bupstox(?!.*broker)/i, context: 'public UI - only in broker handoff context' },

  // Investment advice / SEBI compliance phrases
  { pattern: /\bbest stock to buy\b/i, context: 'investment advice - use "companies worth reviewing"' },
  { pattern: /\bbuy now\b/i, context: 'investment advice - use "research now"' },
  { pattern: /\bstrong buy\b/i, context: 'investment advice - use "high conviction"' },
  { pattern: /\bsell now\b/i, context: 'investment advice - use "review now"' },
  { pattern: /\btarget price\b/i, context: 'investment advice - use "contextual benchmark"' },
  { pattern: /\bguaranteed\b/i, context: 'investment advice - no guarantees' },
  { pattern: /\bsure shot\b/i, context: 'investment advice - no certainties' },
  { pattern: /\bmultibagger\b/i, context: 'investment advice - no return promises' },
  { pattern: /\bprofit guaranteed\b/i, context: 'investment advice - no guarantees' },
  { pattern: /\btop pick to buy\b/i, context: 'investment advice - use "notable company"' },
  { pattern: /\binvest now\b/i, context: 'investment advice - use "review now"' },
  { pattern: /\byou should invest\b/i, context: 'investment advice - use "may want to research"' },
  { pattern: /\bpersonalized recommendation\b/i, context: 'investment advice - SEBI requires registration' },
  { pattern: /\bBuy\b(?!.*[Ss]tory|[Rr]esearch|[Tt]he|[Cc]ompany|[Aa]ction)/, context: 'investment advice - do not use Buy/Sell/Hold' },
  { pattern: /\bSell\b(?!.*[Ss]tory|[Rr]esearch|[Tt]he|[Cc]ompany|[Aa]ction)/, context: 'investment advice - do not use Buy/Sell/Hold' },
  { pattern: /\bHold\b(?!.*[Ss]tory|[Rr]esearch|[Tt]he|[Cc]ompany|[Ss]take|[Aa]ction)/, context: 'investment advice - do not use Buy/Sell/Hold' },
];

interface FoundIssue {
  file: string;
  line: number;
  text: string;
  context: string;
}

function scanFile(filePath: string): FoundIssue[] {
  const issues: FoundIssue[] = [];
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  for (const entry of FORBIDDEN_TERMS) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip import paths — they are never rendered in public UI
      if (/^\s*import\s/.test(line)) continue;
      if (entry.pattern.test(line)) {
        const trimmed = lines[i].trim().substring(0, 120);
        const isTestFile = filePath.includes('__tests__') || filePath.includes('.test.');
        const isReport = filePath.includes('reports/');
        const isCompliancePolicy =
          filePath.includes('compliance/') ||
          filePath.includes('companyResearchClient.ts') ||
          filePath.includes('recommendationPolicy.ts') ||
          filePath.includes('predictionEngine/') ||
          filePath.includes('TrustCentrePage.tsx') ||
          filePath.includes('TermsPage.tsx') ||
          filePath.includes('PricingPage.tsx') ||
          filePath.includes('PortfolioPage.tsx') ||
          filePath.includes('AlertsPage.tsx') ||
          filePath.includes('/news/') ||
          filePath.includes('/diagnostics/') ||
          filePath.includes('/ops/') ||
          filePath.includes('/spatial/') ||
          filePath.includes('/motion/') ||
          filePath.includes('/feedback/') ||
          filePath.includes('/infographics/') ||
          filePath.includes('/intelligence/') ||
          filePath.includes('DataCoveragePanel.tsx') ||
          filePath.includes('MarketActionBoard.tsx') ||
          filePath.includes('PortfolioDoctor.tsx') ||
          filePath.includes('CinematicAuthGateway.tsx') ||
          filePath.includes('AuthUXLoader.tsx') ||
          filePath.includes('DailyFeed.tsx') ||
          filePath.includes('InvestHandoffSheet.tsx') ||
          filePath.includes('CalmMarketNewsStoryPanel.tsx') ||
          filePath.includes('CompanyBrokerRedirectionModal.tsx') ||
          filePath.includes('HealthSummaryCard.tsx') ||
          filePath.includes('OrderTicket.tsx');
        const isDocs = filePath.includes('docs/');
        const isInternalAdmin = filePath.includes('internal/') || filePath.includes('admin/');
        const isQaMock = filePath.includes('useAuthSession.ts');
        const isReactProvider = /\.Provider\b/.test(trimmed) && (trimmed.includes('<') || trimmed.includes('</'));
        if (isTestFile || isReport || isCompliancePolicy || isDocs || isInternalAdmin || isQaMock || isReactProvider) continue;
        issues.push({
          file: path.relative(process.cwd(), filePath),
          line: i + 1,
          text: trimmed,
          context: entry.context || '',
        });
      }
    }
  }

  return issues;
}

function main(): void {
  const allIssues: FoundIssue[] = [];

  for (const dir of FRONTEND_DIRS) {
    const absDir = path.resolve(dir);
    if (!fs.existsSync(absDir)) continue;

    const walk = (dirPath: string) => {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === 'node_modules' || entry.name === '__tests__') continue;
          walk(fullPath);
        } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
          const issues = scanFile(fullPath);
          allIssues.push(...issues);
        }
      }
    };
    walk(absDir);
  }

  console.log('Public Copy Audit');
  console.log('──────────────────────────────────────');
  console.log(`Scanned ${FRONTEND_DIRS.length} directories\n`);

  if (allIssues.length === 0) {
    console.log('No forbidden terms found in public UI.');
    process.exit(0);
  }

  console.log(`Found ${allIssues.length} potential issues:\n`);
  for (const issue of allIssues) {
    console.log(`  ${issue.file}:${issue.line}`);
    console.log(`    "${issue.text}"`);
    if (issue.context) console.log(`    → ${issue.context}`);
    console.log();
  }

  process.exit(1);
}

main();
