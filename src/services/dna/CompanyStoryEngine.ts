// src/services/dna/CompanyStoryEngine.ts
import { RegisteredStock } from "../stocks/StockRegistry";

export interface CompanyStory {
  whatItDoes: string;
  whyFollow: string;
  recentChange: string;
  whatToWatch: string;
  fullNarrative: string;
}

export class CompanyStoryEngine {
  public static generate(stock: RegisteredStock): CompanyStory {
    const symbol = stock.symbol;

    const whatItDoes = `${stock.companyName} provides high-capacity engineering and technical operations in the Philippine market, specializing in the ${stock.sector} sector.`;
    const whyFollow = `Investors follow this asset because it has established strong legacy relationships with key infrastructure networks, providing a solid cushion for cash flows.`;
    const recentChange = `Recently, the company adjusted its operational footprint, aligning delivery timelines to capture steady sector momentum.`;
    const whatToWatch = `Watch for upcoming structural project clearances and changes in quarterly execution speed next season.`;

    const fullNarrative = `${whatItDoes} ${whyFollow} ${recentChange} ${whatToWatch}`;

    return {
      whatItDoes,
      whyFollow,
      recentChange,
      whatToWatch,
      fullNarrative,
    };
  }
}
