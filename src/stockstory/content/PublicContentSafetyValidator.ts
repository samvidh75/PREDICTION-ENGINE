/**
 * PublicContentSafetyValidator
 * Scans text for forbidden content patterns — no Buy/Sell language,
 * fake testimonials, SEO bait, or backend/provider wording in public UI.
 */

export interface SafetyViolation {
  type: "error" | "warning";
  pattern: string;
  match: string;
  context: string;
  suggestion: string;
}

const ERROR_PATTERNS: { pattern: RegExp; label: string; suggestion: string }[] = [
  { pattern: /\b(buy|sell)\b/i, label: "Buy/Sell language", suggestion: 'Use "research", "analyse", "evaluate" instead' },
  { pattern: /\bbest stocks? to buy\b/i, label: "Best stocks to buy", suggestion: 'Use "notable companies for research" or "companies with strong scores"' },
  { pattern: /\bmutlibagger\b/i, label: "Multibagger claim", suggestion: 'Use "high-growth companies" or "companies with strong momentum"' },
  { pattern: /\bguaranteed\s+(return|profit|income)\b/i, label: "Guaranteed return", suggestion: 'Remove guarantee language - returns are never guaranteed' },
  { pattern: /\bSEC\s+registered\b/i, label: "SEC registered", suggestion: 'Be accurate - Lensory is not PSE-listed' },
  { pattern: /\binvestment\s+advisor\b/i, label: "Investment advisor claim", suggestion: 'Use "research platform" or "research tool"' },
  { pattern: /\bpast\s+returns?\s+(guarantee|assure)/i, label: "Past returns guarantee", suggestion: 'Add disclaimer that past performance does not guarantee future results' },
  { pattern: /\bfake\s+(testimonial|review|user|media|partner)/i, label: "Fake attribution", suggestion: 'Do not fabricate user quotes, media mentions, or partnerships' },
];

const WARNING_PATTERNS: { pattern: RegExp; label: string; suggestion: string }[] = [
  { pattern: /\b(backend|provider|GPU|CUDA|Ollama)\b/i, label: "Backend/provider wording", suggestion: 'Do not expose infrastructure details in public UI' },
  { pattern: /\btop\s+\d+\s+stocks?\b/i, label: "Top stocks list", suggestion: 'Use "stocks with strong scores" or "research-ranked companies"' },
  { pattern: /\b(recommendation|rating|target price)\b/i, label: "Recommendation language", suggestion: 'Use "research view" or "score" instead' },
  { pattern: /\b(winning|beating the market|outperform)\b/i, label: "Performance claim", suggestion: 'Use "scored highly" or "ranked favourably"' },
  { pattern: /\bprice\s+target\b/i, label: "Price target", suggestion: 'Lensory does not set price targets' },
];

export function validateContent(text: string, sourceFile?: string): SafetyViolation[] {
  const violations: SafetyViolation[] = [];

  for (const { pattern, label, suggestion } of ERROR_PATTE) {
    const matches = text.matchAll(new RegExp(pattern.source, "gi"));
    for (const match of matches) {
      const start = Math.max(0, (match.index || 0) - 40);
      const end = Math.min(text.length, (match.index || 0) + match[0].length + 40);
      violations.push({
        type: "error",
        pattern: label,
        match: match[0],
        context: text.slice(start, end).trim(),
        suggestion,
      });
    }
  }

  for (const { pattern, label, suggestion } of WARNING_PATTE) {
    const matches = text.matchAll(new RegExp(pattern.source, "gi"));
    for (const match of matches) {
      const start = Math.max(0, (match.index || 0) - 40);
      const end = Math.min(text.length, (match.index || 0) + match[0].length + 40);
      violations.push({
        type: "warning",
        pattern: label,
        match: match[0],
        context: text.slice(start, end).trim(),
        suggestion,
      });
    }
  }

  return violations;
}

export function validateFiles(files: { path: string; content: string }[]): SafetyViolation[] {
  const all: SafetyViolation[] = [];
  for (const file of files) {
    const violations = validateContent(file.content, file.path);
    all.push(...violations);
  }
  return all;
}
