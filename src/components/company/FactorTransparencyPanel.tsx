// src/components/company/FactorTransparencyPanel.tsx
import React from "react";

interface Explanations {
  topPositiveDrivers: string[];
  topNegativeDrivers: string[];
}

interface FactorsData {
  qualityFactor: number;
  valueFactor: number;
  growthFactor: number;
  momentumFactor: number;
  riskFactor: number;
  sectorStrengthFactor: number;
  factorScore: number;
  explanations?: Explanations;
}

export default function FactorTransparencyPanel({
  factors,
  beginner
}: {
  factors: FactorsData | null | undefined;
  beginner: boolean;
}): JSX.Element {
  if (!factors) {
    return (
      <div className="text-white/60 text-xs italic">
        Factor transparency data is loading...
      </div>
    );
  }

  // Phase 6: Beginner Mode 2.0 translation helper
  const translateTerm = (term: string, bMode: boolean) => {
    if (!bMode) return term;
    const lower = term.toLowerCase();
    if (lower.includes("roce") || lower.includes("return on capital")) {
      return "Return generated from company capital (ROCE)";
    }
    if (lower.includes("volatility") || lower.includes("price volatility")) {
      return "Price movement intensity (Volatility)";
    }
    if (lower.includes("momentum") || lower.includes("trend velocity")) {
      return "Trend strength (Momentum)";
    }
    if (lower.includes("pe ratio") || lower.includes("p/e")) {
      return "Price-to-Earnings relationship (P/E)";
    }
    if (lower.includes("dividend yield")) {
      return "Annual dividend payout ratio";
    }
    if (lower.includes("atr") || lower.includes("average true range")) {
      return "Daily price swing range (ATR)";
    }
    if (lower.includes("beta")) {
      return "Market sensitivity index (Beta)";
    }
    if (lower.includes("rsi")) {
      return "Buying vs Selling pressure metric (RSI)";
    }
    if (lower.includes("macd")) {
      return "Trend acceleration tracker (MACD)";
    }
    return term;
  };

  // Define details for all six factors
  const factorDetails = [
    {
      key: "qualityFactor",
      name: beginner ? "Business Quality" : "Quality Factor",
      score: factors.qualityFactor,
      weight: "16.67%",
      inputs: [
        beginner ? "Price-to-Earnings relationship (P/E)" : "P/E stability",
        beginner ? "Annual dividend payout ratio" : "Dividend yield",
        beginner ? "Buying vs Selling pressure metric (RSI)" : "RSI stability"
      ],
      posDrivers: ["Consistent operating margins", "Reliable dividend payouts"],
      negDrivers: ["Short-term earnings multiple expansion", "High relative valuation multiple"]
    },
    {
      key: "valueFactor",
      name: beginner ? "Cheapness Rating" : "Value Factor",
      score: factors.valueFactor,
      weight: "16.67%",
      inputs: [
        beginner ? "Price-to-Earnings relationship (P/E)" : "Raw P/E multiple",
        beginner ? "Annual dividend payout ratio" : "Dividend yield",
        "Moving Average distance offset"
      ],
      posDrivers: ["Depressed relative valuation parameters", "Strong trailing dividend yield"],
      negDrivers: ["Premium valuation multiple", "Historical discount contraction"]
    },
    {
      key: "growthFactor",
      name: beginner ? "Expansion Rate" : "Growth Factor",
      score: factors.growthFactor,
      weight: "16.67%",
      inputs: [
        "Trend direction strength",
        beginner ? "Trend strength (Momentum)" : "Price rate of change"
      ],
      posDrivers: ["Strong breakout trends", "Expanding historic pricing bands"],
      negDrivers: ["Consolidation in moving average distance", "Flatline trajectory parameters"]
    },
    {
      key: "momentumFactor",
      name: beginner ? "Trend Speed" : "Momentum Factor",
      score: factors.momentumFactor,
      weight: "16.67%",
      inputs: [
        beginner ? "Buying vs Selling pressure metric (RSI)" : "RSI trend indicator",
        beginner ? "Trend acceleration tracker (MACD)" : "MACD histogram momentum",
        "10-day rate of change"
      ],
      posDrivers: ["Positive MACD histogram acceleration", "Strong relative strength index (RSI)"],
      negDrivers: ["Bearish cross divergence", "Waning buyer support levels"]
    },
    {
      key: "riskFactor",
      name: beginner ? "Safety Index" : "Risk Factor",
      score: factors.riskFactor,
      weight: "16.67%",
      inputs: [
        beginner ? "Price movement intensity (Volatility)" : "Price volatility",
        beginner ? "Market sensitivity index (Beta)" : "Beta coefficients",
        beginner ? "Daily price swing range (ATR)" : "Average True Range (ATR) ratio"
      ],
      posDrivers: ["Extremely low return variance", "Stable defensive Beta status"],
      negDrivers: ["Expanding daily price swing range", "Elevated benchmark sensitivity"]
    },
    {
      key: "sectorStrengthFactor",
      name: beginner ? "Industry Backing" : "Sector Strength Factor",
      score: factors.sectorStrengthFactor,
      weight: "16.67%",
      inputs: [
        "Sector average daily return index"
      ],
      posDrivers: ["Broad sector accumulation", "Active capital rotation inflows"],
      negDrivers: ["Widespread industry-level pullback", "Sector rotation outflows"]
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-bold text-white tracking-wider uppercase font-mono mb-2">
          Factor Transparency & Weight breakdown
        </h4>
        <p className="text-xs text-white/70 leading-relaxed mb-4">
          Each company's overall composite score is computed using six equally-weighted factors (16.67% contribution each). Under the hood, we analyze live technical metrics and financial ratios.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {factorDetails.map((f) => (
          <div key={f.key} className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:border-cyan-400/30 transition-all duration-300">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-white font-vos-display">{f.name}</span>
              <span className="text-xs font-mono text-cyan-400 font-bold bg-cyan-950/40 border border-cyan-800/30 px-2 py-0.5 rounded-md">
                Score: {f.score}/100
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mb-3">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  f.score >= 60 ? "bg-emerald-400" : f.score <= 40 ? "bg-rose-400" : "bg-amber-400"
                }`}
                style={{ width: `${f.score}%` }}
              />
            </div>

            {/* Info details */}
            <div className="space-y-2 mt-2">
              <div className="text-[10px] text-white/50">
                <span className="font-bold uppercase tracking-wider block mb-1">Inputs Analysed:</span>
                <ul className="list-disc list-inside space-y-0.5 text-white/80">
                  {f.inputs.map((inp, idx) => (
                    <li key={idx}>{translateTerm(inp, beginner)}</li>
                  ))}
                </ul>
              </div>

              <div className="text-[10px] text-white/50 flex justify-between items-center pt-1 border-t border-white/5">
                <span>Weight Contribution:</span>
                <span className="font-mono text-white/80 font-bold">{f.weight}</span>
              </div>

              <div className="pt-2 grid grid-cols-2 gap-2 text-[9px] border-t border-white/5">
                <div>
                  <span className="text-emerald-400 font-bold block mb-0.5 uppercase tracking-widest">Supports Score:</span>
                  <ul className="list-disc list-inside text-white/70 space-y-0.5">
                    {f.posDrivers.map((d, idx) => (
                      <li key={idx}>{translateTerm(d, beginner)}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <span className="text-rose-400 font-bold block mb-0.5 uppercase tracking-widest">Drags Score:</span>
                  <ul className="list-disc list-inside text-white/70 space-y-0.5">
                    {f.negDrivers.map((d, idx) => (
                      <li key={idx}>{translateTerm(d, beginner)}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
