export type NormalizedStockData = {
  ticker: string;
  companyName: string;
  exchange: "PSE" | "PSE" | "SME";
  price: number;
  change: number; // Daily change percentage
  health: "Very Healthy" | "Healthy" | "Stable" | "Weakening" | "Unhealthy";
};

export class ExchangeNormalizer {
  /**
   * Normalizes incoming raw data from diverse exchange feeds into a unified schema (Section 122).
   */
  static normalize(raw: {
    symbol?: string;
    bseCode?: string;
    name?: string;
    company?: string;
    lastPrice?: number;
    price?: number;
    pctChange?: number;
    change?: number;
    healthScore?: number;
    healthVal?: string;
  }): NormalizedStockData {
    const ticker = (raw.symbol || raw.bseCode || "UNKNOWN").toUpperCase();
    const companyName = raw.name || raw.company || "Unknown Company";
    
    const price = raw.lastPrice || raw.price || 0;
    const change = raw.pctChange || raw.change || 0;

    let health: NormalizedStockData["health"] = "Stable";
    const score = raw.healthScore;
    if (score !== undefined) {
      if (score >= 90) health = "Very Healthy";
      else if (score >= 75) health = "Healthy";
      else if (score >= 60) health = "Stable";
      else if (score >= 45) health = "Weakening";
      else health = "Unhealthy";
    } else if (raw.healthVal) {
      const h = raw.healthVal.toLowerCase().trim();
      if (h.includes("very healthy")) health = "Very Healthy";
      else if (h.includes("healthy")) health = "Healthy";
      else if (h.includes("weakening")) health = "Weakening";
      else if (h.includes("unhealthy")) health = "Unhealthy";
    }

    return {
      ticker,
      companyName,
      exchange: "PSE", // Default normalization exchange mapping
      price,
      change,
      health
    };
  }
}
