export type ProductLanguageFilterLevel = "system" | "gentle";

/**
 * Product language cleanup for normal product UI.
 * Goals:
 * - reduce verbosity / prototype-like phrasing
 * - enforce system-style labels (short, OS-native)
 * - keep it conservative (only normalize known patterns + separators)
 *
 * IMPORTANT:
 * - Never add legal/disclaimer text here.
 * - Never rewrite dynamic numeric/technical content aggressively.
 */
export function applyProductLanguageCopyFilter(
  input: string,
  level: ProductLanguageFilterLevel = "system",
): string {
  if (!input) return input;

  let out = input;

  // Normalize whitespace.
  out = out.replace(/\s{2,}/g, " ").trim();

  // Normalize separators spacing.
  out = out.replace(/\s+•\s+/g, " • ");
  out = out.replace(/\s+-\s+/g, " - ");
  out = out.replace(/(\s+•\s*)+$/g, "");
  out = out.replace(/(\s+-\s*)+$/g, "");

  const forbiddenReplacements: Array<[RegExp, string]> = [
    [/\btelemetry\b/gi, "data"],
    [/\becosystem\b/gi, "system"],
    [/\bcalibration\b/gi, "adjustment"],
    [/\bintelligence layer\b/gi, "analysis view"],
    [/\bneural network\b/gi, "model"],
    [/\binstitutional node\b/gi, "institutional position"],
    [/\bpipeline\b/gi, "process"],
    [/\bengine status\b/gi, "system status"],
    [/\bquantum\b/gi, "measured"],
    [/\bsignal amplification\b/gi, "stronger signal"],
    [/\bconfidence transmission\b/gi, "confidence trend"],
    [/\bliquidity pulse\b/gi, "liquidity trend"],
    [/\bstrategic alignment\b/gi, "business fit"],
    [/\bdisruption\b/gi, "change"],
  ];

  for (const [re, to] of forbiddenReplacements) out = out.replace(re, to);

  if (level === "system") {
    // System-style label reductions (only common UI labels; avoid touching arbitrary sentences).
    // Keep these mappings conservative (word-level).
    const replacements: Array<[RegExp, string]> = [
      [/\bPractice Terminal\b/gi, "Practice"],
      [/\bCommunity Intelligence\b/gi, "Community"],
      [/\bMarket Scanner\b/gi, "Scanner"],
      [/\bHealthometer Labs\b/gi, "Healthometer"],
      [/\bMarket Intelligence Dashboard\b/gi, "Dashboard"],
      [/\bAI Assistant\b/gi, "Assistant"],
      [/\bCommand centre\b/gi, "Command"],
      [/\bRecent searches\b/gi, "Recent"],
      [/\bQuick picks\b/gi, "Quick"],
      [/\bMarket summary\b/gi, "Market Overview"],
      [/\bCompare sector\b/gi, "Compare"],
      [/\bView news\b/gi, "News"],

      // Premium terminology reductions (label-only, conservative)
      [/\bMarket Pulse Layer\b/gi, "Market Pulse"],
      [/\bMarket Overview Architecture\b/gi, "Market Overview"],
      [/\bContext-first market summary\b/gi, "Market Overview"],
      [/\bFII\/DII flow tone\b/gi, "Flow tone"],
      [/\bSector breadth\b/gi, "Breadth"],
      [/\bMarket Signals\b/gi, "Signals"],
      [/\bMarket cues\b/gi, "Signals"],
      [/\bTelemetry offline\b/gi, "Telemetry off"],
    ];

    for (const [re, to] of replacements) out = out.replace(re, to);

    // Avoid “educational progression environments” tone in headings.
    out = out.replace(/\bEducational progression environments\b/gi, "Learning Environment");
    out = out.replace(/\bEducational progression\b/gi, "Learning");
  } else if (level === "gentle") {
    // Gentle emotional UX (conservative label-only edits).
    // IMPORTANT: Do NOT rewrite arbitrary sentences; only soften known UI phrases.
    const gentleReplacements: Array<[RegExp, string]> = [
      // Soften “offline / failure” framing
      [/\bTelemetry offline\b/gi, "Telemetry paused"],
      [/\bVolatility active\b/gi, "Volatility present"],
      [/\bTelemetry offline\b/gi, "Telemetry paused"],

      // Reduce sharpness in short guidance strings
      [/\bUnlock\b/gi, "Open"],
      [/\bRisk\b/gi, "risk"],

      // Keep OS-native, calm label contractions
      [/\bQuick picks\b/gi, "Quick"],
      [/\bRecent searches\b/gi, "Recent"],
    ];

    for (const [re, to] of gentleReplacements) out = out.replace(re, to);

    // Gentle mirror of system reductions for known label phrases.
    out = out.replace(/\bMarket summary\b/gi, "Market Overview");
    out = out.replace(/\bMarket Scanner\b/gi, "Scanner");
  }

  return out;
}
