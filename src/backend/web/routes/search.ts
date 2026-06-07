import type { FastifyPluginAsync } from "fastify";
import { apiError, apiSuccess } from "../../types/api";
import { predictiveDiscoveryArchitecture } from "../../../services/search/PredictiveDiscoveryArchitecture";
import { universalIntelligenceSearch } from "../../../services/discovery/universalIntelligenceSearch";
import type { ConfidenceState } from "../../../components/intelligence/ConfidenceEngine";

type QueryShape = {
  query?: unknown;
  intensity?: unknown;

  confidenceState?: unknown;
  marketStateLabel?: unknown;
  narrativeKey?: unknown;

  preferredSectors?: unknown;
  preferredThemes?: unknown;
};

function splitList(raw: unknown): string[] | undefined {
  if (typeof raw !== "string") return undefined;
  const s = raw.trim();
  if (!s) return undefined;
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 10);
}

function parseConfidenceState(raw: unknown): ConfidenceState {
  const s = typeof raw === "string" ? raw : "NEUTRAL_ENVIRONMENT";
  return s as ConfidenceState;
}

export const searchRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/search/predictive", async (req) => {
    const q = req.query as QueryShape;

    const query = typeof q.query === "string" ? q.query : "";
    const intensityRaw = q.intensity;

    const intensity = typeof intensityRaw === "string" ? Number(intensityRaw) : Number(intensityRaw);
    if (Number.isFinite(intensity)) predictiveDiscoveryArchitecture.setHolographicIntensity(intensity);

    const predictions = predictiveDiscoveryArchitecture.generatePredictions(query);

    return apiSuccess({ query, predictions });
  });

  app.get("/api/search/universal", async (req) => {
    const q = req.query as QueryShape;

    const query = typeof q.query === "string" ? q.query : "";
    if (!query.trim()) {
      return apiError("INVALID_INPUT", "Missing query param: query");
    }

    const confidenceState = parseConfidenceState(q.confidenceState);
    const marketStateLabel = typeof q.marketStateLabel === "string" ? q.marketStateLabel : "NEUTRAL_MARKET";
    const narrativeKeyNum = typeof q.narrativeKey === "string" ? Number(q.narrativeKey) : Number(q.narrativeKey);
    const narrativeKey = Number.isFinite(narrativeKeyNum) ? narrativeKeyNum : 7;

    const preferredSectors = splitList(q.preferredSectors);
    const preferredThemes = splitList(q.preferredThemes);

    const results = universalIntelligenceSearch({
      query,
      confidenceState,
      marketStateLabel,
      narrativeKey,
      preferredSectors,
      preferredThemes,
    });

    return apiSuccess({ query, results });
  });
};
