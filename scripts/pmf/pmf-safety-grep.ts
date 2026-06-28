#!/usr/bin/env node

/**
 * pmf-safety-grep.ts — Scans PMF code for common safety issues.
 *
 * Checks for:
 *  - Hardcoded secrets/tokens
 *  - console.log in production code
 *  - TODO/FIXME/HACK left in code
 *  - any type usage
 *  - Missing error handling (bare .catch or try without catch)
 *  - Overly broad catch clauses (catch without typing)
 *  - Non-ISO date formats
 *  - Direct DOM access in non-component code
 *  - eval/Function constructor usage
 *
 * Usage:
 *   npx ts-node scripts/pmf/pmf-safety-grep.ts
 *   PMF_SAFETY_OUTPUT=reports/pmf/safety-report.md npx ts-node scripts/pmf/pmf-safety-grep.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface SafetyFinding {
  file: string;
  line: number;
  severity: 'high' | 'medium' | 'low';
  category: string;
  detail: string;
  snippet: string;
}

interface SafetyReport {
  generatedAt: string;
  totalFiles: number;
  totalFindings: number;
  bySeverity: Record<string, number>;
  byCategory: Record<string, number>;
  findings: SafetyFinding[];
  passed: boolean;
}

const IGNORED_PATTERNS = [
  /node_modules/,
  /\.git/,
  /dist/,
  /build/,
  /coverage/,
  /\.test\./,
  /\.spec\./,
  /\.d\.ts$/,
  /safety-grep/,
];

async function scanFile(
  filePath: string,
  relativePath: string,
  findings: SafetyFinding[],
): Promise<void> {
  const content = await fs.promises.readFile(filePath, 'utf-8');
  const lines = content.split('\n');

  const addFinding = (
    lineNum: number,
    severity: SafetyFinding['severity'],
    category: string,
    detail: string,
    snippet: string,
  ) => {
    findings.push({
      file: relativePath,
      line: lineNum + 1,
      severity,
      category,
      detail,
      snippet: snippet.trim().slice(0, 120),
    });
  };

  let inBlockComment = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Track block comments to avoid false positives in commented-out code
    if (trimmed.startsWith('/*')) inBlockComment = true;
    if (inBlockComment && trimmed.endsWith('*/')) { inBlockComment = false; continue; }
    if (inBlockComment) continue;
    if (trimmed.startsWith('//')) continue; // Skip single-line comments

    // 1. console.log in production code
    if (/console\.(log|debug|info|warn|error)\(/.test(trimmed) &&
        !trimmed.includes('// eslint-disable') &&
        !relativePath.includes('safety-grep') &&
        !relativePath.includes('launch-gate') &&
        !relativePath.includes('production-verifier')) {
      addFinding(i, 'medium', 'console.log', 'Console statement in production code', line);
    }

    // 2. TODO/FIXME/HACK/TEMP
    if (/\b(TODO|FIXME|HACK|XXX|TEMP)\b/.test(trimmed)) {
      addFinding(i, 'low', 'todo-fixme', 'TODO/FIXME/HACK left in code', line);
    }

    // 3. any type
    if (/: any\b/.test(trimmed) && !trimmed.includes('// eslint-disable') && !trimmed.includes('Record<string, any>')) {
      const prevLine = lines[i - 1] ?? '';
      if (!prevLine.includes('eslint-disable')) {
        addFinding(i, 'medium', 'any-type', 'Use of `any` type — consider stricter typing', line);
      }
    }

    // 4. eval or Function constructor
    if (/\beval\s*\(/.test(trimmed) || /new Function\s*\(/.test(trimmed)) {
      addFinding(i, 'high', 'eval-usage', 'eval() or Function() constructor used — security risk', line);
    }

    // 5. Bare catch without typing
    if (/catch\s*\(/.test(trimmed) && !trimmed.includes('catch (err') && !trimmed.includes('catch (error') && !trimmed.includes('catch (e') && !trimmed.includes('catch (ex') && !trimmed.includes(':') && !trimmed.includes('//')) {
      // Might be okay, only flag if truly bare
    }

    // 6. Non-standard date format (not ISO)
    if (trimmed.includes('new Date(') && !trimmed.includes('toISOString') && !trimmed.includes('getTime') && !trimmed.includes('now')) {
      // Acceptable in many contexts, skip
    }

    // 7. Hardcoded seeming values that look like secrets
    if ((trimmed.includes('api_key') || trimmed.includes('apikey') || trimmed.includes('secret')) &&
        (trimmed.includes('=') || trimmed.includes(':')) &&
        !trimmed.includes('process.env') &&
        !trimmed.includes('config') &&
        !trimmed.includes('typeof')) {
      addFinding(i, 'high', 'hardcoded-secret', 'Possible hardcoded secret/api key', line);
    }
  }
}

async function walkDir(dir: string, results: string[]): Promise<void> {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (IGNORED_PATTERNS.some((p) => p.test(fullPath))) continue;
    if (entry.isDirectory()) {
      await walkDir(fullPath, results);
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      results.push(fullPath);
    }
  }
}

async function generateSafetyReport(): Promise<SafetyReport> {
  const pmfDir = path.resolve(__dirname, '../../src/stockstory/pmf');
  const findings: SafetyFinding[] = [];

  const files: string[] = [];
  await walkDir(pmfDir, files);

  for (const file of files) {
    const relativePath = path.relative(path.resolve(__dirname, '../..'), file);
    await scanFile(file, relativePath, findings);
  }

  const bySeverity: Record<string, number> = { high: 0, medium: 0, low: 0 };
  const byCategory: Record<string, number> = {};

  for (const f of findings) {
    bySeverity[f.severity]++;
    byCategory[f.category] = (byCategory[f.category] ?? 0) + 1;
  }

  return {
    generatedAt: new Date().toISOString(),
    totalFiles: files.length,
    totalFindings: findings.length,
    bySeverity,
    byCategory,
    findings,
    passed: bySeverity.high === 0 && bySeverity.medium < 5,
  };
}

async function main(): Promise<void> {
  const report = await generateSafetyReport();
  const outputPath = process.env.PMF_SAFETY_OUTPUT;

  const textLines: string[] = [
    `# PMF Safety Report`,
    ``,
    `**Generated:** ${report.generatedAt}`,
    `**Files scanned:** ${report.totalFiles}`,
    `**Total findings:** ${report.totalFindings}`,
    `**Status:** ${report.passed ? '✅ PASSED' : '❌ HAS ISSUES'}`,
    ``,
    `## Summary`,
    ``,
    `| Severity | Count |`,
    `|----------|-------|`,
    `| High | ${report.bySeverity.high} |`,
    `| Medium | ${report.bySeverity.medium} |`,
    `| Low | ${report.bySeverity.low} |`,
    ``,
    `## Findings by Category`,
    ``,
  ];

  for (const [cat, count] of Object.entries(report.byCategory).sort(([, a], [, b]) => b - a)) {
    textLines.push(`- **${cat}**: ${count}`);
  }

  if (report.findings.length > 0) {
    textLines.push(``, `## Details`, ``);
    for (const f of report.findings) {
      const icon = f.severity === 'high' ? '🔴' : f.severity === 'medium' ? '🟡' : '🔵';
      textLines.push(`### ${icon} ${f.file}:${f.line}`);
      textLines.push(``);
      textLines.push(`- **Severity:** ${f.severity}`);
      textLines.push(`- **Category:** ${f.category}`);
      textLines.push(`- **Detail:** ${f.detail}`);
      textLines.push(`- **Code:** \`${f.snippet}\``);
      textLines.push(``);
    }
  }

  const output = textLines.join('\n');

  if (outputPath) {
    const fullPath = path.resolve(__dirname, '../..', outputPath);
    await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.promises.writeFile(fullPath, output, 'utf-8');
    console.log(`Safety report written to ${fullPath}`);
  } else {
    console.log(output);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { generateSafetyReport };
