import { describe, expect, it } from "vitest";
import type {
  CompanyProfileView,
  CompanyQuoteView,
  CompanyFundamentalsView,
  CompanyFactorScoresView,
  CompanyThesisView,
  CompanyRiskView,
  CompanyPeersView,
  CompanyHistoryView,
  ScannerResultView,
  CompareResultView,
  WatchlistThesisView,
  AlertChangeView,
  InvestReviewContextView,
  ThesisStatus,
  RiskLevel,
  AlertTone,
} from "./productContracts";

describe("Canonical product data contracts", () => {
  it("CompanyProfileView allows all-null optional fields", () => {
    const profile: CompanyProfileView = {
      symbol: "RELIANCE",
      companyName: "Reliance Industries Ltd",
      sector: null,
      industry: null,
      description: null,
      website: null,
      listingDate: null,
      faceValue: null,
      isin: null,
    };
    expect(profile.symbol).toBe("RELIANCE");
    expect(profile.sector).toBeNull();
  });

  it("CompanyQuoteView accepts null price fields without NaN", () => {
    const quote: CompanyQuoteView = {
      symbol: "TCS",
      lastPrice: null,
      change: null,
      changePercent: null,
      open: null,
      high: null,
      low: null,
      close: null,
      volume: null,
      marketCap: null,
      dayRange: null,
      week52High: null,
      week52Low: null,
    };
    expect(JSON.stringify(quote)).not.toMatch(/NaN|undefined|\[object Object\]/);
    expect(quote.lastPrice).toBeNull();
  });

  it("CompanyFundamentalsView handles partial fundamentals", () => {
    const f: CompanyFundamentalsView = {
      symbol: "INFY",
      peRatio: 28.5,
      pbRatio: null,
      evEbitda: null,
      dividendYield: 1.2,
      eps: 45.6,
      bookValue: null,
      roe: 25.3,
      roa: null,
      roic: null,
      debtToEquity: 0.1,
      currentRatio: null,
      grossMargin: null,
      operatingMargin: null,
      netMargin: null,
      revenueGrowth: 12.4,
      profitGrowth: null,
      epsGrowth: null,
      sales: null,
      netProfit: null,
      operatingProfit: null,
      totalAssets: null,
      totalDebt: null,
      equity: null,
      cashFlow: null,
      freeCashFlow: null,
    };
    expect(f.peRatio).toBe(28.5);
    expect(f.pbRatio).toBeNull();
    expect(Object.values(f).every(v => v === null || v === "INFY" || typeof v === "number")).toBe(true);
  });

  it("CompanyFactorScoresView prevents provider labels", () => {
    const scores: CompanyFactorScoresView = {
      symbol: "HDFC",
      qualityScore: 78,
      valuationScore: 45,
      growthScore: 62,
      riskScore: 55,
      momentumScore: 70,
      stabilityScore: 80,
      convictionScore: 72,
      qualityExplanation: "Strong profitability metrics",
      valuationExplanation: null,
      growthExplanation: "Revenue growth above sector average",
      riskExplanation: null,
      momentumExplanation: null,
      stabilityExplanation: null,
    };
    const json = JSON.stringify(scores);
    expect(json).not.toMatch(/provider|api|backend|source|internal|diagnostic/i);
    expect(scores.convictionScore).toBe(72);
  });

  it("CompanyThesisView supports all thesis statuses", () => {
    const statuses: ThesisStatus[] = [
      "Strengthening", "Stable", "Weakening", "Needs review",
      "Tracking begins now", "Research signals pending",
    ];
    for (const status of statuses) {
      const thesis: CompanyThesisView = {
        symbol: "TEST",
        status,
        thesis: null,
        bullCase: null,
        bearCase: null,
        topStrengths: [],
        topRisks: [],
        whatWouldChange: [],
        priorStatus: null,
      };
      expect(thesis.status).toBe(status);
    }
  });

  it("CompanyRiskView supports all risk levels", () => {
    const levels: RiskLevel[] = ["High", "Moderate", "Low", "Insufficient data"];
    for (const overallRisk of levels) {
      const r: CompanyRiskView = {
        symbol: "TEST",
        overallRisk,
        leverageRisk: null,
        volatilityRisk: null,
        liquidityRisk: null,
        earningsRisk: null,
        sectorRisk: null,
        keyRiskFlags: [],
      };
      expect(r.overallRisk).toBe(overallRisk);
    }
  });

  it("CompanyPeersView contains peers with product-safe labels", () => {
    const peers: CompanyPeersView = {
      symbol: "TCS",
      peers: [
        { symbol: "INFY", companyName: "Infosys Ltd", score: 72, conviction: "Healthy" },
        { symbol: "HCLT", companyName: "HCL Tech", score: 65, conviction: "Unhealthy" },
      ],
    };
    expect(peers.peers).toHaveLength(2);
    expect(JSON.stringify(peers)).not.toMatch(/buy|sell|hold|provider|backend/i);
  });

  it("CompanyHistoryView handles empty history", () => {
    const h: CompanyHistoryView = {
      symbol: "UNKNOWN",
      priceHistory: [],
      earliestDate: null,
      latestDate: null,
      dataPoints: 0,
    };
    expect(h.dataPoints).toBe(0);
    expect(h.priceHistory).toEqual([]);
  });

  it("ScannerResultView uses product-safe language", () => {
    const r: ScannerResultView = {
      symbol: "RELIANCE",
      companyName: "Reliance Industries Ltd",
      sector: "Oil & Gas",
      rank: 1,
      conviction: "Very Healthy",
      score: 82,
      oneLineThesis: "Strong business quality with improving digital segment margins",
      keyReason: "Quality is the clearest current signal",
      riskMarker: "Risk review normal",
    };
    expect(JSON.stringify(r)).not.toMatch(/buy|sell|hold|target|guaranteed|multibagger/i);
    expect(r.conviction).toBe("Very Healthy");
  });

  it("CompareResultView allows null recommendation", () => {
    const cmp: CompareResultView = {
      companies: [],
      recommendation: null,
      factorComparison: [],
      missingDataCaveat: "Some factors have insufficient data for comparison.",
    };
    expect(cmp.recommendation).toBeNull();
    expect(cmp.missingDataCaveat).toBeTruthy();
  });

  it("WatchlistThesisView supports tracking-begins state", () => {
    const w: WatchlistThesisView = {
      symbol: "NEW",
      companyName: "New Company",
      currentStatus: "Tracking begins now",
      previousStatus: null,
      conviction: "Needs research",
      score: null,
      lastUpdated: null,
    };
    expect(w.currentStatus).toBe("Tracking begins now");
    expect(w.previousStatus).toBeNull();
  });

  it("AlertChangeView supports all alert tones", () => {
    const tones: AlertTone[] = [
      "thesis_change", "risk_change", "valuation_change",
      "watchlist_review", "price_move", "peer_change", "event",
    ];
    for (const type of tones) {
      const a: AlertChangeView = {
        id: "1",
        symbol: "TEST",
        type,
        title: "Test alert",
        body: "Test body",
        timestamp: "2024-01-01T00:00:00Z",
        acknowledged: false,
      };
      expect(a.type).toBe(type);
    }
  });

  it("InvestReviewContextView does not expose backend terminology", () => {
    const ctx: InvestReviewContextView = {
      symbol: "TCS",
      companyName: "Tata Consultancy Services",
      conviction: "Very Healthy",
      score: 78,
      thesis: "Strong IT services leader with consistent execution",
      keyRisks: ["Wage inflation", "Currency headwinds"],
      keyStrengths: ["Market leadership", "Strong balance sheet"],
      whatToWatch: ["Q3 margin trends", "Client spending outlook"],
      missingCriticalData: [],
    };
    const json = JSON.stringify(ctx);
    expect(json).not.toMatch(/provider|backend|api|source|diagnostic|internal|lineage/i);
    expect(ctx.conviction).toBe("Very Healthy");
  });
});
