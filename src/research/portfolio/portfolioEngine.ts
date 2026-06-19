import type { InvestReviewContextView } from "../contracts/productContracts";
import type { WatchlistThesisView } from "../contracts/productContracts";

export interface PortfolioHoldingInput {
  symbol: string;
  companyName: string;
  currentScore: number | null;
  thesisStatus: string;
  conviction: string;
  keyRisks: string[];
  keyStrengths: string[];
  whatToWatch: string[];
}

export function monitorPortfolio(holdings: PortfolioHoldingInput[]): {
  holdings: InvestReviewContextView[];
  reviewPriority: string[];
  summary: string;
} {
  if (holdings.length === 0) {
    return { holdings: [], reviewPriority: [], summary: "No holdings tracked yet." };
  }

  const views: InvestReviewContextView[] = holdings.map(h => ({
    symbol: h.symbol,
    companyName: h.companyName,
    conviction: h.conviction,
    score: h.currentScore,
    thesis: h.thesisStatus !== "Research signals pending" ? `Thesis is ${h.thesisStatus.toLowerCase()}` : null,
    keyRisks: h.keyRisks,
    keyStrengths: h.keyStrengths,
    whatToWatch: h.whatToWatch,
    missingCriticalData: h.currentScore === null ? ["Research signals pending"] : [],
  }));

  const priority = views
    .filter(v => v.conviction === "Needs review" || v.conviction === "Track before investing")
    .sort((a, b) => (a.score ?? 0) - (b.score ?? 0))
    .map(v => `${v.symbol}: ${v.conviction}`);

  const summary = priority.length > 0
    ? `${priority.length} holding(s) need review.`
    : "Portfolio thesis status is stable.";

  return { holdings: views, reviewPriority: priority, summary };
}
