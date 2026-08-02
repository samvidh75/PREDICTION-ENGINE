import type { NormalizedFundamentals } from "../normalization/types";
import { mean } from "@/utils/statisticalUtils";

export interface ValuationFeatures {
  peScore: number | null;
  pbScore: number | null;
  evEbitdaScore: number | null;
  dividendScore: number | null;
  overallValuation: number | null;
  confidence: number;
  missingInputs: string[];
}

export function computeValuationFeatures(f: NormalizedFundamentals): ValuationFeatures {
  const missing: string[] = [];
  if (f.peRatio === null) missing.push("peRatio");
  if (f.pbRatio === null) missing.push("pbRatio");

  let peScore: number | null = null;
  if (f.peRatio !== null && f.peRatio > 0) {
    peScore = f.peRatio <= 15 ? 80 : f.peRatio <= 25 ? 65 : f.peRatio <= 40 ? 45 : f.peRatio <= 60 ? 30 : 20;
  } else if (f.peRatio !== null && f.peRatio < 0) {
    peScore = 10;
  }

  let pbScore: number | null = null;
  if (f.pbRatio !== null && f.pbRatio > 0) {
    pbScore = f.pbRatio <= 1.5 ? 80 : f.pbRatio <= 3 ? 65 : f.pbRatio <= 5 ? 45 : 25;
  } else if (f.pbRatio !== null && f.pbRatio < 0) {
    pbScore = 10;
  }

  let evEbitdaScore: number | null = null;
  if (f.evEbitda !== null && f.evEbitda > 0) {
    evEbitdaScore = f.evEbitda <= 8 ? 80 : f.evEbitda <= 15 ? 60 : f.evEbitda <= 25 ? 40 : 20;
  }

  let dividendScore: number | null = null;
  if (f.dividendYield !== null) {
    dividendScore = f.dividendYield >= 3 ? 80 : f.dividendYield >= 1.5 ? 65 : f.dividendYield > 0 ? 50 : 30;
  }

  const present = [f.peRatio, f.pbRatio, f.evEbitda, f.dividendYield].filter(v => v !== null).length;
  const confidence = Math.round((present / 4) * 100);

  const scores = [peScore, pbScore, evEbitdaScore, dividendScore].filter((s): s is number => s !== null);
  const overallValuation = scores.length >= 2 ? mean(scores) : null;

  return { peScore, pbScore, evEbitdaScore, dividendScore, overallValuation, confidence, missingInputs: missing };
}
