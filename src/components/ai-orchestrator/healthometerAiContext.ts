import type { ResearchAiContext } from "./researchAiTypes";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cleanText(value: unknown, max = 180): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(/\s+/g, " ").trim().slice(0, max);
  if (!text) return null;
  if (/\b(provider|backend|api|webllm|webgpu|ollama|buy|sell|hold|target)\b/i.test(text)) return null;
  return text;
}

function cleanList(values: unknown[], max = 4): string[] | undefined {
  const items = values.map((value) => cleanText(value)).filter((value): value is string => Boolean(value)).slice(0, max);
  return items.length ? items : undefined;
}

export function toHealthometerAiContext(input: unknown): ResearchAiContext | null {
  if (!isRecord(input)) return null;

  const symbol = cleanText(input.symbol, 24);
  const companyName = cleanText(input.companyName);
  const title = cleanText(input.title ?? input.label ?? "Healthometer");
  const healthScore = typeof input.score === "number" && Number.isFinite(input.score) ? input.score : null;
  const state = cleanText(input.state ?? input.label);
  const explanation = cleanList([
    ...(Array.isArray(input.explanation) ? input.explanation : []),
    ...(Array.isArray(input.summary) ? input.summary : []),
  ]);
  const factors = Array.isArray(input.factors)
    ? cleanList(input.factors.flatMap((item) => {
      if (typeof item === "string") return [item];
      if (isRecord(item)) return [item.label, item.summary, item.reason];
      return [];
    }))
    : undefined;
  const risksToReview = Array.isArray(input.risksToReview) ? cleanList(input.risksToReview) : undefined;
  const whatToWatch = Array.isArray(input.whatToWatch) ? cleanList(input.whatToWatch) : undefined;

  const context: ResearchAiContext = {
    surface: "healthometer",
    symbol,
    companyName,
    title,
    healthometer: {
      score: healthScore,
      state,
      explanation,
      factors,
    },
    risksToReview,
    whatToWatch,
  };

  const hasSafeData = Boolean(
    symbol
    || companyName
    || title
    || state
    || healthScore != null
    || explanation?.length
    || factors?.length
    || risksToReview?.length
    || whatToWatch?.length,
  );

  return hasSafeData ? context : null;
}
