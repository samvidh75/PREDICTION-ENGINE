/**
 * Sector Analysis
 * Groups portfolio holdings by sector and provides insights
 */

export interface SectorInfo {
  name: string;
  description: string;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface SectorAllocation {
  sector: string;
  allocation: number; // percentage
  tickers: string[];
  value: number;
  return: number;
  returnPercent: number;
}

export interface SectorAnalysis {
  sectors: SectorAllocation[];
  diversified: boolean; // more than 3 sectors
  riskProfile: 'conservative' | 'moderate' | 'aggressive';
  recommendations: string[];
}

const SECTOR_MAP: Record<string, SectorInfo> = {
  IT: {
    name: 'Information Technology',
    description: 'Software, IT services, hardware manufacturers',
    riskLevel: 'medium',
  },
  BANKING: {
    name: 'Banking & Finance',
    description: 'Banks, insurance, financial services',
    riskLevel: 'medium',
  },
  AUTOMOBILE: {
    name: 'Automobile',
    description: 'Car manufacturers, auto parts suppliers',
    riskLevel: 'high',
  },
  PHARMA: {
    name: 'Pharmaceuticals',
    description: 'Drug manufacturers, healthcare companies',
    riskLevel: 'medium',
  },
  FMCG: {
    name: 'Consumer Goods',
    description: 'Fast-moving consumer goods, FMCG',
    riskLevel: 'low',
  },
  ENERGY: {
    name: 'Energy & Utilities',
    description: 'Oil, gas, electricity, power generation',
    riskLevel: 'high',
  },
  METAL: {
    name: 'Metals & Mining',
    description: 'Steel, mining, mineral companies',
    riskLevel: 'high',
  },
  REALTY: {
    name: 'Real Estate',
    description: 'Real estate developers, property companies',
    riskLevel: 'high',
  },
  INFRA: {
    name: 'Infrastructure',
    description: 'Roads, ports, airports, infrastructure',
    riskLevel: 'medium',
  },
  CONSTRUCTION: {
    name: 'Construction',
    description: 'Construction companies, engineering firms',
    riskLevel: 'high',
  },
};

const TICKER_SECTOR_MAP: Record<string, string> = {
  // IT
  'TCS': 'IT',
  'INFY': 'IT',
  'WIPRO': 'IT',
  'HCL': 'IT',
  'TECHM': 'IT',
  // Banking
  'HDFCBANK': 'BANKING',
  'ICICIBANK': 'BANKING',
  'AXISBANK': 'BANKING',
  'SBIN': 'BANKING',
  'KOTAKBANK': 'BANKING',
  'AUBANK': 'BANKING',
  // Auto
  'MARUTI': 'AUTOMOBILE',
  'BAJAJSUSSAN': 'AUTOMOBILE',
  'TATA': 'AUTOMOBILE',
  'FORCEMOTOR': 'AUTOMOBILE',
  // Pharma
  'SUNPHARMA': 'PHARMA',
  'DIVISLAB': 'PHARMA',
  'LUPIN': 'PHARMA',
  'CIPLA': 'PHARMA',
  // FMCG
  'ITC': 'FMCG',
  'UNILEVER': 'FMCG',
  'NESTLEIND': 'FMCG',
  'COLPAL': 'FMCG',
  // Energy
  'RELIANCE': 'ENERGY',
  'IOC': 'ENERGY',
  'BPCL': 'ENERGY',
  'NTPC': 'ENERGY',
  // Metals
  'JSW': 'METAL',
  'HINDALCO': 'METAL',
  'TATASTEEL': 'METAL',
  // Realty
  'DLF': 'REALTY',
  'LODHA': 'REALTY',
  // Infra
  'POWERGRID': 'INFRA',
  'BHARTIARTL': 'INFRA',
};

class SectorAnalysisService {
  /**
   * Get sector for ticker
   */
  getSectorForTicker(ticker: string): string {
    return TICKER_SECTOR_MAP[ticker] || 'OTHER';
  }

  /**
   * Get sector info
   */
  getSectorInfo(sector: string): SectorInfo | null {
    return SECTOR_MAP[sector] || null;
  }

  /**
   * Analyze portfolio sectors
   */
  analyzeSectorAllocation(holdings: Array<{ ticker: string; value: number; gain: number; gainPercent: number }>): SectorAnalysis {
    const sectorMap = new Map<string, SectorAllocation>();
    let totalValue = 0;

    // Group by sector
    holdings.forEach((holding) => {
      const sector = this.getSectorForTicker(holding.ticker);
      totalValue += holding.value;

      if (!sectorMap.has(sector)) {
        sectorMap.set(sector, {
          sector,
          allocation: 0,
          tickers: [],
          value: 0,
          return: 0,
          returnPercent: 0,
        });
      }

      const sectorData = sectorMap.get(sector)!;
      sectorData.tickers.push(holding.ticker);
      sectorData.value += holding.value;
      sectorData.return += holding.gain;
    });

    // Calculate percentages
    const sectors = Array.from(sectorMap.values()).map((s) => ({
      ...s,
      allocation: (s.value / totalValue) * 100,
      returnPercent: (s.return / s.value) * 100,
    }));

    // Determine diversification
    const diversified = sectors.length > 3;

    // Determine risk profile
    let riskScore = 0;
    sectors.forEach((s) => {
      const info = this.getSectorInfo(s.sector);
      const riskWeight = {
        low: 1,
        medium: 2,
        high: 3,
      };
      riskScore += (riskWeight[info?.riskLevel || 'medium'] * s.allocation) / 100;
    });

    let riskProfile: 'conservative' | 'moderate' | 'aggressive' = 'moderate';
    if (riskScore < 1.5) riskProfile = 'conservative';
    if (riskScore > 2.3) riskProfile = 'aggressive';

    // Generate recommendations
    const recommendations: string[] = [];

    if (!diversified) {
      recommendations.push('⚠️ Limited diversification - consider adding stocks from other sectors');
    }

    // Check for over-concentration in high-risk sectors
    const highRiskAllocation = sectors
      .filter((s) => this.getSectorInfo(s.sector)?.riskLevel === 'high')
      .reduce((sum, s) => sum + s.allocation, 0);

    if (highRiskAllocation > 50) {
      recommendations.push('📊 High concentration in high-risk sectors - consider adding stable sector stocks');
    }

    // Check sector balance
    const maxAllocation = Math.max(...sectors.map((s) => s.allocation));
    if (maxAllocation > 40) {
      const topSector = sectors.find((s) => s.allocation === maxAllocation);
      recommendations.push(`📉 ${topSector?.sector} is over-allocated (${maxAllocation.toFixed(1)}%) - consider rebalancing`);
    }

    // Positive recommendations
    if (riskProfile === 'conservative' && sectors.length >= 5) {
      recommendations.push('✅ Well-diversified conservative portfolio');
    }

    if (sectors.some((s) => s.returnPercent > 10)) {
      recommendations.push('📈 Strong performers in portfolio - hold for momentum');
    }

    return {
      sectors: sectors.sort((a, b) => b.allocation - a.allocation),
      diversified,
      riskProfile,
      recommendations,
    };
  }

  /**
   * Get sector strength (momentum based on recent gains)
   */
  getSectorStrength(sectorAllocation: SectorAllocation[]): string {
    const avgReturn = sectorAllocation.reduce((sum, s) => sum + s.returnPercent, 0) / sectorAllocation.length;

    if (avgReturn > 5) return 'bullish';
    if (avgReturn < -2) return 'bearish';
    return 'neutral';
  }

  /**
   * Get rebalancing suggestions
   */
  getRebalancingSuggestions(analysis: SectorAnalysis): Array<{ action: string; sector: string; reason: string }> {
    const suggestions: Array<{ action: string; sector: string; reason: string }> = [];

    // Suggest adding underrepresented sectors
    const lowAllocationSectors = analysis.sectors.filter((s) => s.allocation < 10);
    lowAllocationSectors.forEach((s) => {
      if (s.allocation === 0) {
        suggestions.push({
          action: 'ADD',
          sector: s.sector,
          reason: 'Sector not represented in portfolio',
        });
      }
    });

    // Suggest trimming over-allocated sectors
    const overAllocated = analysis.sectors.filter((s) => s.allocation > 30);
    overAllocated.forEach((s) => {
      const info = this.getSectorInfo(s.sector);
      if (info?.riskLevel === 'high') {
        suggestions.push({
          action: 'TRIM',
          sector: s.sector,
          reason: 'High-risk sector over-allocated',
        });
      }
    });

    return suggestions.slice(0, 3); // Top 3 suggestions
  }
}

export const sectorAnalysisService = new SectorAnalysisService();
