#!/usr/bin/env node
/**
 * validate-analyst-outputs.ts
 */

import { AnalystOutputValidator } from '../../src/stockstory/analyst/validation/AnalystOutputValidator';
import { companyDeepDiveGenerator } from '../../src/stockstory/analyst/company/CompanyDeepDiveGenerator';
import { earningsNoteGenerator } from '../../src/stockstory/analyst/earnings/EarningsNoteGenerator';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const validator = new AnalystOutputValidator();

const samples = [
  companyDeepDiveGenerator.generate({ symbol: 'TCS', companyName: 'Tata Consultancy Services' }),
  earningsNoteGenerator.generate('TCS', { revenue: 100, profit: 20, operatingMargin: 25 }),
];

const results = samples.map((s, i) => {
  const v = validator.validate(s as unknown as Record<string, unknown>);
  return { index: i, passed: v.passed, errors: v.errors };
});

const report = [
  '# Analyst Output Validation',
  '',
  `Generated: ${new Date().toISOString()}`,
  '',
  ...results.map((r) => `- Sample ${r.index}: ${r.passed ? 'PASS' : 'FAIL'} ${r.errors.join('; ')}`),
].join('\n');

mkdirSync(join(process.cwd(), 'reports/analyst'), { recursive: true });
writeFileSync(join(process.cwd(), 'reports/analyst/17-analyst-output-validation.md'), report);
console.log(report);
process.exit(results.every((r) => r.passed) ? 0 : 1);
