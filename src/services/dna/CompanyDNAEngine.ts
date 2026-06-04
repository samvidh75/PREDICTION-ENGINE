// src/services/dna/CompanyDNAEngine.ts
import { RegisteredStock } from "../stocks/StockRegistry";
import { BusinessQualityEngine, DNAStatus } from "./BusinessQualityEngine";
import { GrowthEngine } from "./GrowthEngine";
import { StabilityEngine } from "./StabilityEngine";
import { RiskEngine } from "./RiskEngine";
import { SentimentEngine } from "./SentimentEngine";

export interface CompanyDNASnapshot {
  businessQuality: { score: number; status: DNAStatus };
  growth: { score: number; status: DNAStatus };
  stability: { score: number; status: DNAStatus };
  risk: { score: number; status: DNAStatus };
  sentiment: { score: number; status: DNAStatus };
}

export class CompanyDNAEngine {
  public static compute(stock: RegisteredStock): CompanyDNASnapshot {
    return {
      businessQuality: BusinessQualityEngine.evaluate(stock),
      growth: GrowthEngine.evaluate(stock),
      stability: StabilityEngine.evaluate(stock),
      risk: RiskEngine.evaluate(stock),
      sentiment: SentimentEngine.evaluate(stock),
    };
  }
}
