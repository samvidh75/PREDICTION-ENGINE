import type {
  DataQualityReport, PresenceScore, FreshnessScore, ConsistencyScore,
  NumericValidityScore, CompletenessScore, ConfidenceScore, QualitySummary,
  AvailabilityLevel, FreshnessLevel, ConsistencyLevel, CompletenessLevel, DataQualityLevel,
} from "./dataQualityModel";

const STALE_QUOTE_HOURS = 24;
const STALE_FUNDAMENTALS_DAYS = 90;
const STALE_PRICE_HISTORY_DAYS = 7;

export function assessPresence(
  hasQuote: boolean, hasFundamentals: boolean, hasHistory: boolean
): PresenceScore {
  const present = [hasQuote, hasFundamentals, hasHistory].filter(Boolean).length;
  let overall: AvailabilityLevel;
  if (present === 3) overall = "Full";
  else if (present >= 2) overall = "Partial";
  else if (present >= 1) overall = "Minimal";
  else overall = "None";

  return { quoteAvailable: hasQuote, fundamentalsAvailable: hasFundamentals, priceHistoryAvailable: hasHistory, overall };
}

export function assessFreshness(
  quoteAgeHours: number | null,
  fundamentalsAgeDays: number | null,
  historyAgeDays: number | null,
): FreshnessScore {
  const quoteFresh = quoteAgeHours !== null && quoteAgeHours <= STALE_QUOTE_HOURS;
  const fundamentalsFresh = fundamentalsAgeDays !== null && fundamentalsAgeDays <= STALE_FUNDAMENTALS_DAYS;
  const historyFresh = historyAgeDays !== null && historyAgeDays <= STALE_PRICE_HISTORY_DAYS;

  const freshCount = [quoteFresh, fundamentalsFresh, historyFresh].filter(Boolean).length;
  const knownCount = [quoteAgeHours, fundamentalsAgeDays, historyAgeDays].filter(v => v !== null).length;

  let overall: FreshnessLevel;
  if (knownCount === 0) overall = "Unknown";
  else if (freshCount === knownCount) overall = "Current";
  else if (freshCount >= knownCount / 2) overall = "Recent";
  else overall = "Stale";

  return { quoteAgeHours, fundamentalsAgeDays, priceHistoryAgeDays: historyAgeDays, quoteFresh, fundamentalsFresh, priceHistoryFresh: historyFresh, overall };
}

export function assessConsistency(
  quoteFundamentalsMatch: boolean | null,
  crossProviderMatch: boolean | null,
): ConsistencyScore {
  let overall: ConsistencyLevel;
  if (quoteFundamentalsMatch === null && crossProviderMatch === null) overall = "Unknown";
  else if (quoteFundamentalsMatch === false || crossProviderMatch === false) overall = "Inconsistent";
  else if (quoteFundamentalsMatch === true && (crossProviderMatch === true || crossProviderMatch === null)) overall = "Consistent";
  else overall = "Minor issues";

  return {
    quoteFundamentalsConsistent: quoteFundamentalsMatch ?? false,
    crossProviderMatch: crossProviderMatch ?? false,
    overall,
  };
}

export function assessNumericValidity(invalid: string[], nan: string[], inf: string[]): NumericValidityScore {
  return {
    invalidNumericFields: invalid,
    nanFields: nan,
    infinityFields: inf,
    overall: invalid.length === 0 && nan.length === 0 && inf.length === 0,
  };
}

export function assessCompleteness(
  totalExpected: number, totalAvailable: number, missingCritical: string[]
): CompletenessScore {
  const ratio = totalExpected > 0 ? totalAvailable / totalExpected : 0;
  let overall: CompletenessLevel;
  if (ratio >= 0.8 && missingCritical.length === 0) overall = "Complete";
  else if (ratio >= 0.4) overall = "Partial";
  else overall = "Insufficient";

  return { totalExpected, totalAvailable, completenessRatio: ratio, missingCritical, overall };
}

export function assessConfidence(
  inputConfidence: number,
  coverageConfidence: number,
  freshnessConfidence: number,
): ConfidenceScore {
  const validInput = Number.isFinite(inputConfidence) ? inputConfidence : 0;
  const validCoverage = Number.isFinite(coverageConfidence) ? coverageConfidence : 0;
  const validFreshness = Number.isFinite(freshnessConfidence) ? freshnessConfidence : 0;
  const overall = Math.round((validInput + validCoverage + validFreshness) / 3);
  return {
    inputConfidence: validInput,
    coverageConfidence: validCoverage,
    freshnessConfidence: validFreshness,
    overallConfidence: Math.max(0, Math.min(100, overall)),
  };
}

export function assessQuality(report: DataQualityReport): DataQualityLevel {
  const { presence, freshness, completeness, numericValidity } = report;

  if (!numericValidity.overall) return "Low";
  if (presence.overall === "None") return "Insufficient";

  const hasCoreData = presence.quoteAvailable || presence.fundamentalsAvailable;
  if (!hasCoreData) return "Insufficient";

  if (presence.overall === "Full" && freshness.overall === "Current" && completeness.overall === "Complete") {
    return "High";
  }

  if (presence.overall === "Full" || presence.overall === "Partial") {
    if (freshness.overall === "Stale" || completeness.overall === "Insufficient") return "Low";
    return "Medium";
  }

  if (presence.overall === "Minimal") return "Low";
  return "Insufficient";
}

export function assessAll(params: {
  symbol: string;
  hasQuote: boolean;
  hasFundamentals: boolean;
  hasHistory: boolean;
  quoteAgeHours: number | null;
  fundamentalsAgeDays: number | null;
  historyAgeDays: number | null;
  quoteFundamentalsMatch: boolean | null;
  crossProviderMatch: boolean | null;
  invalidNumeric: string[];
  nanFields: string[];
  infinityFields: string[];
  totalExpected: number;
  totalAvailable: number;
  missingCritical: string[];
  inputConfidence: number;
  coverageConfidence: number;
  freshnessConfidence: number;
}): DataQualityReport {
  const presence = assessPresence(params.hasQuote, params.hasFundamentals, params.hasHistory);
  const freshness = assessFreshness(params.quoteAgeHours, params.fundamentalsAgeDays, params.historyAgeDays);
  const consistency = assessConsistency(params.quoteFundamentalsMatch, params.crossProviderMatch);
  const numericValidity = assessNumericValidity(params.invalidNumeric, params.nanFields, params.infinityFields);
  const completeness = assessCompleteness(params.totalExpected, params.totalAvailable, params.missingCritical);
  const confidence = assessConfidence(params.inputConfidence, params.coverageConfidence, params.freshnessConfidence);

  const report: DataQualityReport = {
    symbol: params.symbol,
    presence, freshness, consistency, numericValidity, completeness, confidence,
    summary: { level: "Insufficient", pass: false, reasons: [] },
  };

  const level = assessQuality(report);
  const reasons: string[] = [];
  if (presence.overall === "None") reasons.push("No data available");
  if (!numericValidity.overall) reasons.push("Invalid numeric values detected");
  if (freshness.overall === "Stale") reasons.push("Data is stale");
  if (completeness.overall === "Insufficient") reasons.push("Insufficient data coverage");

  report.summary = { level, pass: level === "High" || level === "Medium", reasons };
  return report;
}
