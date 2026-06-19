import type { LeaderboardEntry, Signal } from "../../services/api/client";

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
  if (score === null) return "Research signals pending";
  return `${Math.round(score)}`;
}

function convictionLabel(score: number | null, confidence: number | null): string {
  if (score === null) return "Needs research";
  if (score >= 75 && (confidence === null || confidence >= 60)) return "High conviction";
  if (score >= 55) return "Moderate conviction";
  if (score >= 40) return "Needs review";
  return "Needs research";
}

function leadingFactor(entry: LeaderboardEntry): string {
  const factors = Object.entries(entry.factors)
    .map(([key, value]) => ({ key, value: cleanNumber(value) }))
    .filter((item): item is { key: string; value: number } => item.value !== null)
    .sort((a, b) => b.value - a.value);

  if (factors.length === 0) return "Research signals pending";
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

export function leaderboardEntryToResearchListItem(entry: LeaderboardEntry): ResearchListItem {
  const score = cleanNumber(entry.rankingScore);
  const confidence = cleanNumber(entry.confidenceScore);
  const sector = cleanText(entry.sector, "Sector pending");
  const risk = cleanNumber(entry.factors.risk);

  return {
    symbol: cleanText(entry.symbol, "UNKNOWN"),
    company: cleanText(entry.companyName, cleanText(entry.symbol, "Company")),
    sector,
    conviction: convictionLabel(score, confidence),
    score: scoreLabel(score),
    thesis: score === null
      ? "Awaiting research signals."
      : `${sector} company with ${convictionLabel(score, confidence).toLowerCase()} context.`,
    keyReason: leadingFactor(entry),
    riskMarker: risk !== null && risk < 40 ? "Risk rising" : "Risk review normal",
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
