export interface DCFInput {
  freeCashFlow: number;
  fcfGrowthRate: number;
  growthDeclineYears: number;
  terminalGrowthRate: number;
  discountRate: number;
  netDebt: number;
  sharesOutstanding: number;
  cashAndEquivalents: number;
  marginOfSafety: number;
}

export interface DCFOutput {
  fairValuePerShare: number;
  currentPrice: number;
  upside: number;
  marginOfSafety: number;
  impliedReturn: number;
  totalPresentValue: number;
  terminalValue: number;
  pvOfTerminalValue: number;
  pvOfProjectedFCF: number;
  enterpriseValue: number;
  equityValue: number;
  years: DCFYear[];
  assessment: 'undervalued' | 'fairly_valued' | 'overvalued' | 'significantly_undervalued' | 'significantly_overvalued';
}

export interface DCFYear {
  year: number;
  fcf: number;
  growthRate: number;
  discountFactor: number;
  presentValue: number;
}

export class DCFValuationService {
  compute(input: DCFInput, currentPrice: number): DCFOutput {
    const years: DCFYear[] = [];
    let cumulativePV = 0;
    let projectedFCF = input.freeCashFlow;

    for (let y = 1; y <= input.growthDeclineYears; y++) {
      const growthRate = input.fcfGrowthRate * Math.pow(1 - (y - 1) / input.growthDeclineYears, 0.7);
      projectedFCF *= (1 + growthRate);
      const discountFactor = 1 / Math.pow(1 + input.discountRate, y);
      const presentValue = projectedFCF * discountFactor;
      cumulativePV += presentValue;
      years.push({
        year: y,
        fcf: Math.round(projectedFCF),
        growthRate: Math.round(growthRate * 10000) / 100,
        discountFactor: Math.round(discountFactor * 10000) / 10000,
        presentValue: Math.round(presentValue),
      });
    }

    const terminalFCF = projectedFCF * (1 + input.terminalGrowthRate);
    const terminalValue = terminalFCF / (input.discountRate - input.terminalGrowthRate);
    const pvOfTerminalValue = terminalValue / Math.pow(1 + input.discountRate, input.growthDeclineYears);

    const pvOfProjectedFCF = cumulativePV;
    const enterpriseValue = pvOfProjectedFCF + pvOfTerminalValue;
    const equityValue = enterpriseValue - input.netDebt + input.cashAndEquivalents;
    const fairValuePerShare = equityValue / input.sharesOutstanding;

    const safePrice = fairValuePerShare * (1 - input.marginOfSafety);
    const upside = ((fairValuePerShare - currentPrice) / currentPrice) * 100;
    const impliedReturn = Math.pow(fairValuePerShare / currentPrice, 1 / input.growthDeclineYears) - 1;

    let assessment: DCFOutput['assessment'];
    const ratio = currentPrice / fairValuePerShare;
    if (ratio <= 0.6) assessment = 'significantly_undervalued';
    else if (ratio <= 0.85) assessment = 'undervalued';
    else if (ratio <= 1.15) assessment = 'fairly_valued';
    else if (ratio <= 1.4) assessment = 'overvalued';
    else assessment = 'significantly_overvalued';

    return {
      fairValuePerShare: Math.round(fairValuePerShare * 100) / 100,
      currentPrice,
      upside: Math.round(upside * 100) / 100,
      marginOfSafety: input.marginOfSafety,
      impliedReturn: Math.round(impliedReturn * 10000) / 100,
      totalPresentValue: Math.round((pvOfProjectedFCF + pvOfTerminalValue) * 100) / 100,
      terminalValue: Math.round(terminalValue * 100) / 100,
      pvOfTerminalValue: Math.round(pvOfTerminalValue * 100) / 100,
      pvOfProjectedFCF: Math.round(pvOfProjectedFCF * 100) / 100,
      enterpriseValue: Math.round(enterpriseValue * 100) / 100,
      equityValue: Math.round(equityValue * 100) / 100,
      years,
      assessment,
    };
  }

  estimateFromFinancials(
    revenue: number,
    netMargin: number,
    revenueGrowth: number,
    marketCap: number,
    netDebt: number,
    cashAndEquivalents: number,
    sharesOutstanding: number,
    currentPrice: number,
  ): DCFOutput {
    const fcfMargin = netMargin * 0.8;
    const freeCashFlow = revenue * fcfMargin;
    const fcfGrowthRate = revenueGrowth * 0.85;
    const discountRate = 0.12 + (netDebt > 0 ? 0.02 : 0);
    const growthDeclineYears = 10;
    const terminalGrowthRate = 0.04;
    const marginOfSafety = 0.20;

    return this.compute({
      freeCashFlow,
      fcfGrowthRate,
      growthDeclineYears,
      terminalGrowthRate,
      discountRate,
      netDebt,
      sharesOutstanding,
      cashAndEquivalents,
      marginOfSafety,
    }, currentPrice);
  }
}

export const dcfValuationService = new DCFValuationService();
