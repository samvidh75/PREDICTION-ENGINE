import React, { useMemo } from "react";
import useBeginnerIntelligenceCalibration from "../../hooks/useBeginnerIntelligenceCalibration";
import MarketCapPositioningRail from "./MarketCapPositioningRail";

type BeginnerFinancialSimplificationRailProps = Record<string, never>;

/**
 * Wrapper intended to keep existing deterministic finance UI intact (rail, towers)
 * while adapting *explanatory text depth* via beginner calibration.
 */
export default function BeginnerFinancialSimplificationRail(_props: BeginnerFinancialSimplificationRailProps): JSX.Element {
  const { experienceLevel, simplificationIntensity } = useBeginnerIntelligenceCalibration();

  const { helperTitle, helperBody } = useMemo(() => {
    if (experienceLevel === "beginner") {
      return {
        helperTitle: "Beginner-friendly valuation context",
        helperBody:
          "Market cap and PE are used here as educational context only. We describe what the valuation texture can feel like under confidence environments—without forecasting outcomes or giving trade advice.",
      };
    }

    // Intermediate: provide slightly richer interpretation while staying educational.
    return {
      helperTitle: "Interpretive valuation context (educational)",
      helperBody:
        "Market cap and PE are treated as bounded learning signals. The engine links valuation texture to pacing: how confident interpretation becomes sensitive to liquidity and volatility conditions—still probabilistic, still non-execution.",
    };
  }, [experienceLevel]);

  // simplificationIntensity reserved for future use (e.g., progressive disclosure).
  void simplificationIntensity;

  return (
    <div className="space-y-4">
      <div className="rounded-[22px] border border-white/10 bg-black/20 p-5">
        <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">{helperTitle}</div>
        <div className="mt-3 text-[14px] leading-[1.8] text-white/85">{helperBody}</div>
      </div>

      {/* Render the existing rail unchanged; wrapper adds educational text depth */}
      <MarketCapPositioningRail />
    </div>
  );
}
