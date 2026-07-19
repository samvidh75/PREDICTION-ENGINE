/**
 * Safety Auditor
 * Phase 21 — Greps source code and intelligence output for forbidden
 * investment language, backend infrastructure noise, and fake data patterns.
 */
import {
  FORBIDDEN_INVESTMENT_PHRASES,
  FORBIDDEN_BACKEND_PHRASES,
} from '../validation/IntelligenceValidationTypes';

interface SafetyAuditResult {
  filePath: string;
  lineNumber: number;
  line: string;
  matchedPhrase: string;
  category: 'investment' | 'backend' | 'fake_data' | 'hallucination_risk';
  severity: 'error' | 'warning';
}

const FAKE_DATA_PATTERNS = [
  'mockData', 'fakeSymbol', 'testOnly', 'placeholderSymbol',
  'sampleSymbol', 'exampleSymbol',
];

/** US stock symbols that should not appear in PSE equity output */
const US_SYMBOLS = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA'];

const HALLUCINATION_RISK_PATTERNS = [
  'Math.random', 'random()', 'faker.',
  'generateFake', 'generateRandom', 'randomPick',
];

export class SafetyAuditor {
  private forbiddenInvestment = new Map<string, 'investment'>();
  /** Case-sensitive backend patterns — only flag exact matches to avoid noise */
  private forbiddenBackend: Array<{ phrase: string; category: 'backend' }> = [];
  private fakeDataPatterns: Array<{ phrase: string; category: 'fake_data' }> = [];
  private usSymbols: Array<{ phrase: string; category: 'fake_data' }> = [];
  private hallucinationPatterns = new Map<string, 'hallucination_risk'>();

  constructor() {
    for (const p of FORBIDDEN_INVESTMENT_PHRASES) {
      this.forbiddenInvestment.set(p.toLowerCase(), 'investment');
    }
    // Backend phrases: case-sensitive + whole-word to reduce false positives
    for (const p of FORBIDDEN_BACKEND_PHRASES) {
      this.forbiddenBackend.push({ phrase: p, category: 'backend' });
    }
    for (const p of FAKE_DATA_PATTERNS) {
      this.fakeDataPatterns.push({ phrase: p.toLowerCase(), category: 'fake_data' });
    }
    for (const p of US_SYMBOLS) {
      this.usSymbols.push({ phrase: p, category: 'fake_data' });
    }
    for (const p of HALLUCINATION_RISK_PATTERNS) {
      this.hallucinationPatterns.set(p.toLowerCase(), 'hallucination_risk');
    }
  }

  /** Check if a word (whole-word match) exists in the line. */
  private hasWord(line: string, word: string, caseSensitive = false): boolean {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const flags = caseSensitive ? 'g' : 'gi';
    const regex = new RegExp(`\\b${escaped}\\b`, flags);
    return regex.test(line);
  }

  /** META symbol check — skip `import.meta` (Vite's built-in), case-sensitive */
  private isMetaSymbol(line: string): boolean {
    const cleaned = line.replace(/import\.meta/gi, '');
    return this.hasWord(cleaned, 'META', true);
  }

  /**
   * Audit a single line of code/output.
   */
  auditLine(filePath: string, lineNumber: number, line: string): SafetyAuditResult[] {
    const results: SafetyAuditResult[] = [];
    const lowerLine = line.toLowerCase();

    // Check investment phrases
    for (const [phrase, category] of this.forbiddenInvestment) {
      if (lowerLine.includes(phrase)) {
        results.push({ filePath, lineNumber, line, matchedPhrase: phrase, category, severity: 'warning' });
      }
    }

    // Check backend phrases — whole-word, case-insensitive for safety
    for (const { phrase, category } of this.forbiddenBackend) {
      if (this.hasWord(line, phrase)) {
        results.push({ filePath, lineNumber, line, matchedPhrase: phrase, category, severity: 'error' });
      }
    }

    // Check fake data — whole-word to avoid "meta" matching "metadata"
    for (const { phrase, category } of this.fakeDataPatterns) {
      if (this.hasWord(line, phrase)) {
        results.push({ filePath, lineNumber, line, matchedPhrase: phrase, category, severity: 'error' });
      }
    }

    // Check US stock symbols — whole-word, case-sensitive. META excludes import.meta
    for (const { phrase, category } of this.usSymbols) {
      const found = phrase === 'META' ? this.isMetaSymbol(line) : this.hasWord(line, phrase);
      if (found) {
        results.push({ filePath, lineNumber, line, matchedPhrase: phrase, category, severity: 'error' });
      }
    }

    // Check hallucination risks — whole-word
    for (const [phrase, category] of this.hallucinationPatterns) {
      if (this.hasWord(line, phrase)) {
        results.push({ filePath, lineNumber, line, matchedPhrase: phrase, category, severity: 'warning' });
      }
    }

    return results;
  }

  /**
   * Audit content from a file or intelligence output.
   */
  auditContent(filePath: string, content: string): SafetyAuditResult[] {
    const results: SafetyAuditResult[] = [];
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      results.push(...this.auditLine(filePath, i + 1, lines[i]));
    }
    return results;
  }
}

export type { SafetyAuditResult };
