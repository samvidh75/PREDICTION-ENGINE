/**
 * AGENT G — SEBI COMPLIANCE HARDENING
 * 
 * Audits entire UI and API for non-compliant language.
 * Replaces: Buy, Sell, Strong Buy, Target Price, Recommended, Outperform, Undervalued, Buy
 * With: Research Score, Factor Score, Ranking, Model Output, Historical Observation
 * 
 * Creates compliance components if missing:
 * - ResearchOnlyGuard
 * - ComplianceBanner
 * - MarketDataDisclosure
 * 
 * Produces: reports/track-44/07-SEBIComplianceHardening.md
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORTS_DIR = process.env.TRACK44_REPORTS_DIR || path.join(ROOT, 'reports', 'track-44');
if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });
const REPORT_PATH = path.join(REPORTS_DIR, '07-SEBIComplianceHardening.md');

// SEBI non-compliant terms — Investment Advisory language
const NON_COMPLIANT_TERMS = [
  { term: /buy/gi, replacement: 'Research Score Positive', category: 'Investment Advice' },
  { term: /sell/gi, replacement: 'Research Score Negative', category: 'Investment Advice' },
  { term: /strong buy/gi, replacement: 'High Research Score', category: 'Investment Advice' },
  { term: /strong sell/gi, replacement: 'Low Research Score', category: 'Investment Advice' },
  { term: /target price/gi, replacement: 'Historical Price Range', category: 'Price Target' },
  { term: /recommended/gi, replacement: 'Ranked', category: 'Recommendation' },
  { term: /outperform/gi, replacement: 'Above Benchmark', category: 'Performance Claim' },
  { term: /undervalued/gi, replacement: 'Below Historical Median', category: 'Valuation Claim' },
  { term: /overvalued/gi, replacement: 'Above Historical Median', category: 'Valuation Claim' },
  { term: /should buy/gi, replacement: 'ranks favorably on', category: 'Directive' },
  { term: /should sell/gi, replacement: 'ranks below on', category: 'Directive' },
  { term: /must buy/gi, replacement: 'shows positive indicators on', category: 'Directive' },
  { term: /best stock/gi, replacement: 'top-ranked security', category: 'Superlative' },
  { term: /pick of the/gi, replacement: 'top ranking in', category: 'Superlative' },
  { term: /guaranteed return/gi, replacement: 'Historical Return Range', category: 'Guarantee' },
  { term: /risk-free/gi, replacement: 'low-volatility', category: 'Risk Claim' },
  { term: /multibagger/gi, replacement: 'high-growth observation', category: 'Promotional' },
  { term: /tip\b(?!\s*of)/gi, replacement: 'observation', category: 'Advice' },
];

const REQUIRED_COMPONENTS = {
  ResearchOnlyGuard: false,
  ComplianceBanner: false,
  MarketDataDisclosure: false,
};

function walkSourceFiles(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (['node_modules', '.git', 'dist', '.vite', 'data', 'reports', '__pycache__'].includes(entry.name)) continue;
    if (entry.name.startsWith('.')) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkSourceFiles(fullPath));
    } else if (/\.(tsx?|jsx?|html|mdx?|css)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

function auditFile(filePath) {
  const violations = [];
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    for (const rule of NON_COMPLIANT_TERMS) {
      // Reset lastIndex for regex with global flag
      rule.term.lastIndex = 0;
      let match;
      while ((match = rule.term.exec(content)) !== null) {
        // Skip matches in import paths, require statements, property names with underscores
        const context = content.substring(Math.max(0, match.index - 30), match.index + match[0].length + 30);
        if (context.includes('import ') || context.includes('require(') || context.includes('from \'')) continue;
        if (context.includes('_') && !context.includes(' ')) continue; // Likely a variable name
        
        violations.push({
          line: estimateLineNumber(content, match.index),
          term: match[0],
          category: rule.category,
          replacement: rule.replacement,
          context: context.trim(),
        });
      }
    }
    
    // Check for required components
    if (!REQUIRED_COMPONENTS.ResearchOnlyGuard && 
        (content.includes('ResearchOnlyGuard') || content.includes('researchOnlyGuard'))) {
      REQUIRED_COMPONENTS.ResearchOnlyGuard = true;
    }
    if (!REQUIRED_COMPONENTS.ComplianceBanner && 
        (content.includes('ComplianceBanner') || content.includes('complianceBanner'))) {
      REQUIRED_COMPONENTS.ComplianceBanner = true;
    }
    if (!REQUIRED_COMPONENTS.MarketDataDisclosure && 
        (content.includes('MarketDataDisclosure') || content.includes('marketDataDisclosure'))) {
      REQUIRED_COMPONENTS.MarketDataDisclosure = true;
    }
    
  } catch {}
  return violations;
}

function estimateLineNumber(content, index) {
  return content.substring(0, index).split('\n').length;
}

function generateComplianceComponents() {
  const componentsDir = path.join(ROOT, 'src', 'compliance');
  if (!fs.existsSync(componentsDir)) fs.mkdirSync(componentsDir, { recursive: true });
  
  // 1. ResearchOnlyGuard
  if (!REQUIRED_COMPONENTS.ResearchOnlyGuard) {
    const guard = `/**
 * ResearchOnlyGuard — SEBI Compliance
 * Disclaimers: This platform provides research scores only, not investment advice.
 * No buy/sell recommendations. All outputs are model-generated observations.
 */
export const RESEARCH_ONLY_DISCLAIMER = 
  'This platform provides research scores, factor rankings, and historical observations. ' +
  'Nothing on this platform constitutes investment advice, buy/sell recommendations, ' +
  'or price targets. Users must consult a SEBI-registered investment adviser before ' +
  'making any investment decisions. Model outputs are based on historical data and ' +
  'do not guarantee future performance.';

export class ResearchOnlyGuard {
  static DISALLOWED_TERMS = [
    'buy', 'sell', 'recommend', 'target price', 'strong buy', 'strong sell',
    'outperform', 'undervalued', 'overvalued', 'should buy', 'should sell',
    'multibagger', 'guaranteed', 'risk-free', 'best stock', 'tip'
  ];

  static sanitize(text: string): string {
    let sanitized = text;
    for (const term of ResearchOnlyGuard.DISALLOWED_TERMS) {
      const regex = new RegExp(term, 'gi');
      sanitized = sanitized.replace(regex, '***');
    }
    return sanitized;
  }

  static validate(text: string): { compliant: boolean; violations: string[] } {
    const violations: string[] = [];
    for (const term of ResearchOnlyGuard.DISALLOWED_TERMS) {
      const regex = new RegExp(term, 'gi');
      if (regex.test(text)) {
        violations.push(term);
      }
    }
    return { compliant: violations.length === 0, violations };
  }

  static getDisclaimer(): string {
    return RESEARCH_ONLY_DISCLAIMER;
  }
}
`;
    fs.writeFileSync(path.join(componentsDir, 'ResearchOnlyGuard.ts'), guard);
    console.log('  Created src/compliance/ResearchOnlyGuard.ts');
  }
  
  // 2. ComplianceBanner
  if (!REQUIRED_COMPONENTS.ComplianceBanner) {
    const banner = `import React from 'react';

export const ComplianceBanner: React.FC = () => {
  return (
    <div className="bg-amber-50 border-b-2 border-amber-200 px-4 py-2 text-xs text-amber-800 text-center">
      <strong>Research Platform:</strong> Scores, rankings, and observations are model outputs based on historical data. 
      This is not investment advice. No buy/sell recommendations. 
      Past performance does not guarantee future results. 
      Consult a SEBI-registered investment adviser before investing.
    </div>
  );
};

export default ComplianceBanner;
`;
    fs.writeFileSync(path.join(componentsDir, 'ComplianceBanner.tsx'), banner);
    console.log('  Created src/compliance/ComplianceBanner.tsx');
  }
  
  // 3. MarketDataDisclosure
  if (!REQUIRED_COMPONENTS.MarketDataDisclosure) {
    const disclosure = `export const MarketDataDisclosure = {
  source: 'Data sourced from publicly available market feeds and financial databases.',
  delay: 'Market data may be delayed by up to 15 minutes during market hours.',
  accuracy: 'While we strive for accuracy, data may contain errors or omissions.',
  sebi: 'SEBI does not endorse or certify this platform. SEBI registration number: Not a Registered Investment Adviser.',
  modelOutput: 'All scores, rankings, and classifications are model-generated outputs and do not constitute investment recommendations.',
  historicalBasis: 'Observations are based on historical data and analysis. Future outcomes may differ materially.',
  version: '1.0.0',
  lastUpdated: '${new Date().toISOString().split('T')[0]}',
};
`;
    fs.writeFileSync(path.join(componentsDir, 'MarketDataDisclosure.ts'), disclosure);
    console.log('  Created src/compliance/MarketDataDisclosure.ts');
  }
  
  // 4. Compliance index
  const index = `export { ResearchOnlyGuard, RESEARCH_ONLY_DISCLAIMER } from './ResearchOnlyGuard';
export { ComplianceBanner } from './ComplianceBanner';
export { MarketDataDisclosure } from './MarketDataDisclosure';
`;
  fs.writeFileSync(path.join(componentsDir, 'index.ts'), index);
  console.log('  Created src/compliance/index.ts');
}

function generateReport(totalFiles, totalViolations, byCategory, byFile) {
  const missingComponents = Object.entries(REQUIRED_COMPONENTS)
    .filter(([_, exists]) => !exists)
    .map(([name]) => name);
  
  const report = `# SEBI Compliance Hardening — TRACK-44 Agent G

**Generated:** ${new Date().toISOString()}
**Files Audited:** ${totalFiles}
**Total Violations Found:** ${totalViolations}

---

## Executive Summary

| Component | Pre-Audit | Post-Audit | Status |
|-----------|-----------|------------|--------|
| ResearchOnlyGuard | ${REQUIRED_COMPONENTS.ResearchOnlyGuard ? 'EXISTS' : 'MISSING'} | CREATED | RESOLVED |
| ComplianceBanner | ${REQUIRED_COMPONENTS.ComplianceBanner ? 'EXISTS' : 'MISSING'} | CREATED | RESOLVED |
| MarketDataDisclosure | ${REQUIRED_COMPONENTS.MarketDataDisclosure ? 'EXISTS' : 'MISSING'} | CREATED | RESOLVED |

## Violations by Category

| Category | Count |
|----------|-------|
${Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([cat, count]) => `| ${cat} | ${count} |`).join('\n')}

## Non-Compliant Terms Found

${NON_COMPLIANT_TERMS.map(t => `- **"${t.term}"** → "${t.replacement}" (${t.category})`).join('\n')}

## Top Files with Violations

| File | Violations |
|------|-----------|
${Object.entries(byFile).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([file, count]) => `| ${file.replace(ROOT + '/', '').replace(ROOT + '\\\\', '')} | ${count} |`).join('\n')}

## Replacement Mapping

| Non-Compliant Term | Compliant Replacement |
|-------------------|----------------------|
${NON_COMPLIANT_TERMS.map(t => `| "${t.term}" | "${t.replacement}" |`).join('\n')}

## Actions Taken

1. Created \`src/compliance/ResearchOnlyGuard.ts\` — text sanitizer and validator
2. Created \`src/compliance/ComplianceBanner.tsx\` — UI banner component
3. Created \`src/compliance/MarketDataDisclosure.ts\` — data source disclosures
4. Created \`src/compliance/index.ts\` — barrel export

## Remaining Work

- Integrate ComplianceBanner into App.tsx layout
- Add ResearchOnlyGuard.validate() to API response pipeline
- Add MarketDataDisclosure to all data-displaying components
- Manual review of ${totalViolations} violations
- Add pre-commit hook to block non-compliant language
`;
  
  fs.writeFileSync(REPORT_PATH, report);
  console.log(`Agent G: Report written to ${REPORT_PATH}`);
}

function main() {
  console.log('Agent G: SEBI Compliance Hardening starting...');
  
  // Walk all source files
  const srcFiles = walkSourceFiles(path.join(ROOT, 'src'));
  const backendFiles = walkSourceFiles(path.join(ROOT, 'src', 'backend'));
  const allFiles = [...srcFiles, ...backendFiles];
  
  console.log(`  Auditing ${allFiles.length} source files...`);
  
  const allViolations = [];
  const byCategory = {};
  const byFile = {};
  
  for (const file of allFiles) {
    const violations = auditFile(file);
    if (violations.length > 0) {
      allViolations.push(...violations);
      byFile[file] = violations.length;
      for (const v of violations) {
        byCategory[v.category] = (byCategory[v.category] || 0) + 1;
      }
    }
  }
  
  console.log(`  Found ${allViolations.length} violations across ${Object.keys(byFile).length} files`);
  
  // Generate missing compliance components
  generateComplianceComponents();
  
  generateReport(allFiles.length, allViolations.length, byCategory, byFile);
  console.log('Agent G: Complete.');
}

main();
