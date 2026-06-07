import type { ConfidenceState, ConfidenceTheme } from "../intelligence/ConfidenceEngine";

export type TelemetrySignalKind =
  | "stock_movement"
  | "liquidity_behavior"
  | "institutional_participation"
  | "sector_rotation"
  | "confidence_conditions"
  | "macro_sensitivity";

export type TelemetryQuality = "low" | "balanced" | "high";

export type TelemetryPoint = {
  id: string;
  // 0..1 in canvas normalized space
  x: number;
  y: number;
  // relative intensity magnitude
  magnitude: number;
};

export type TelemetryRail = {
  id: string;
  // normalized endpoints in canvas space
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  thicknessPx: number;
  alpha: number;
  // "tone" controls color mapping
  tone: "cyan" | "deepBlue" | "magenta" | "warning";
  // controls pulse cadence/phase
  phase: number;
  // 0..1
  strength: number;
};

export type TelemetryBand = {
  id: string;
  // band center y in 0..1 space
  y: number;
  // 0..1
  thickness: number;
  tone: "cyan" | "deepBlue" | "magenta" | "warning";
  alpha: number;
  // 0..1
  intensity: number;
};

export type TelemetryReadout = {
  id: string;
  kind: TelemetrySignalKind;
  title: string;
  valueLabel: string;
  tone: "cyan" | "deepBlue" | "magenta" | "warning";
  // normalized label position hint
  x: number;
  y: number;
  // max width in px for layout stability
  maxWidthPx: number;
};

export type HolographicTelemetryModel = {
  rails: TelemetryRail[];
  points: TelemetryPoint[];
  bands: TelemetryBand[];
  readouts: TelemetryReadout[];

  // for animation: drives pulse/breathing
  pulseSpeedSec: number;
  orbBreathSec: number;

  // clarity & performance hints
  quality: TelemetryQuality;
  confidenceState: ConfidenceState;
  theme: ConfidenceTheme;
};

export function toneToGlow(
  tone: TelemetryRail["tone"],
  theme: ConfidenceTheme,
): string {
  switch (tone) {
    case "warning":
      return theme.warningGlow;
    case "magenta":
      return theme.magentaGlow;
    case "deepBlue":
      return theme.deepBlueGlow;
    case "cyan":
    default:
      return theme.cyanGlow;
  }
}
