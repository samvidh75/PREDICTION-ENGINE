export const SUPPORTED_PREDICTION_HORIZONS = [7, 30, 90, 180, 365] as const;
export type PredictionHorizon = typeof SUPPORTED_PREDICTION_HORIZONS[number];
export const DEFAULT_PREDICTION_HORIZON: PredictionHorizon = 30;

export function parsePredictionHorizon(value: unknown): PredictionHorizon | null {
  if (value === undefined || value === null || value === "") return DEFAULT_PREDICTION_HORIZON;
  const parsed = typeof value === "number" ? value : Number(String(value));
  return SUPPORTED_PREDICTION_HORIZONS.includes(parsed as PredictionHorizon)
    ? parsed as PredictionHorizon
    : null;
}
