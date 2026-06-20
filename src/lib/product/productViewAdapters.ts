import type { LeaderboardEntry, Signal } from "../../services/api/client";
import type {
  CompanyThesisView,
  ScannerResultView,
  AlertChangeView,
} from "../../research/contracts/productContracts";

export interface ResearchListItem {
  symbol: string;
  company: string;
  sector: string;
  conviction: string;
  score: string;
  thesis: string;
  keyReason: string;
  riskMarker: string;
}

function cleanText(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function cleanNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function scoreLabel(score: number | null): string {
  if (score === null) return "";
  return `${Math.round(score)}`;
}

function convictionLabel(score: number | null, confidence: number | null): string {
  if (score === null) return "";
  if (score >= 75 && (confidence === null || confidence >= 60)) return "Very Healthy";
  if (score >= 55) return "Healthy";
  if (score >= 40) return "Needs review";
  return "Risk rising";
}

function leadingFactor(entry: LeaderboardEntry): string {
  const factors = Object.entries(entry.factors)
    .map(([key, value]) => ({ key, value: cleanNumber(value) }))
    .filter((item): item is { key: string; value: number } => item.value !== null)
    .sort((a, b) => b.value - a.value);

  if (factors.length === 0) return "";
  const label: Record<string, string> = {
    quality: "Quality",
    growth: "Growth",
    value: "Valuation",
    momentum: "Momentum",
    risk: "Risk profile",
    sector: "Sector context",
  };
  return `${label[factors[0].key] ?? "Research"} is the clearest current signal`;
}

function cleanSectorName(sec: string | null | undefined): string {
  if (!sec) return "";
  const cleaned = sec.trim();
  const lower = cleaned.toLowerCase();
  if (
    lower === "sector pending" ||
    lower === "not available" ||
    lower === "unavailable" ||
    lower === "pending" ||
    lower === "none"
  ) {
    return "";
  }
  return cleaned;
}

export function leaderboardEntryToResearchListItem(entry: LeaderboardEntry): ResearchListItem {
  const score = cleanNumber(entry.rankingScore);
  const confidence = cleanNumber(entry.confidenceScore);
  const sector = cleanSectorName(entry.sector);
  const risk = cleanNumber(entry.factors.risk);

  return {
    symbol: cleanText(entry.symbol, "UNKNOWN"),
    company: cleanText(entry.companyName, cleanText(entry.symbol, "Company")),
    sector,
    conviction: convictionLabel(score, confidence),
    score: scoreLabel(score),
    thesis: score === null
      ? ""
      : convictionLabel(score, confidence) ? `${sector || ""} with ${convictionLabel(score, confidence).toLowerCase()} context.` : "",
    keyReason: leadingFactor(entry),
    riskMarker: risk !== null && risk < 40 ? "Risk rising" : "",
  };
}

export interface ProductAlert {
  title: string;
  body: string;
  tone: "caution" | "risk" | "neutral";
}

export function signalToProductAlert(signal: Signal): ProductAlert {
  const symbol = cleanText(signal.symbol, "Tracked company");
  const body = cleanText(signal.explanation, "Track this company to review important changes.");
  const tone = signal.severity === "critical" ? "risk" : signal.severity === "important" ? "caution" : "neutral";
  return {
    title: `${symbol}: what changed`,
    body,
    tone,
  };
}

export interface ResearchAlertView {
  id: string;
  symbol: string;
  title: string;
  body: string;
  type: string;
  timestamp: string;
  acknowledged: boolean;
}

function productAlertTone(type: string): "caution" | "risk" | "neutral" {
  if (type === "risk_change" || type === "price_move") return "risk";
  if (type === "thesis_change" || type === "watchlist_review") return "caution";
  return "neutral";
}

export function alertChangeToProductAlert(alert: AlertChangeView): ProductAlert {
  return {
    title: alert.title,
    body: alert.body,
    tone: productAlertTone(alert.type),
  };
}

export function alertChangeToResearchAlert(alert: AlertChangeView): ResearchAlertView {
  return {
    id: alert.id,
    symbol: alert.symbol,
    title: alert.title,
    body: alert.body,
    type: alert.type,
    timestamp: alert.timestamp,
    acknowledged: alert.acknowledged,
  };
}

export function scannerResultToResearchListItem(result: ScannerResultView): ResearchListItem {
  const sector = cleanSectorName(result.sector);
  const cleanedThesis = cleanThesisLine(result.oneLineThesis, sector);
  return {
    symbol: result.symbol,
    company: result.companyName,
    sector,
    conviction: result.conviction,
    score: scoreLabel(result.score),
    thesis: cleanedThesis,
    keyReason: result.keyReason,
    riskMarker: result.riskMarker ?? "",
  };
}

function cleanThesisLine(thesis: string, sector: string): string {
  if (!thesis) return "";
  const lower = thesis.toLowerCase();
  if (
    lower.includes("sector pending") ||
    lower.includes("not available") ||
    lower.includes("unavailable")
  ) {
    if (sector) {
      return thesis.replace(/sector pending|not available|unavailable/gi, sector);
    }
    const score = thesis.match(/\b(\d+)\b/);
    if (score) return `Healthy research case.`;
    return "Research signals pending.";
  }
  return thesis;
}

export function thesisToStatusText(thesis: CompanyThesisView): string {
  return thesis.thesis ?? "";
}

export function convictionToLabel(convictionScore: number | null): string {
  if (convictionScore === null) return "";
  if (convictionScore >= 75) return "Very Healthy";
  if (convictionScore >= 55) return "Healthy";
  if (convictionScore >= 35) return "Needs review";
  return "Risk rising";
}

export function factorDescription(factor: string, score: number | null): string {
  if (score === null) return "";
  const labels: Record<string, string> = {
    quality: "Quality", valuation: "Valuation", growth: "Growth",
    risk: "Risk", momentum: "Momentum", stability: "Stability",
  };
  return `${labels[factor] ?? factor}: ${Math.round(score)}`;
}
