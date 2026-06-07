import React, { useMemo } from "react";
import { ShieldCheck, ShieldAlert, PieChart } from "lucide-react";

export type MockHolding = {
  ticker: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
};

interface SimulatedPortfolioProps {
  virtualBalance: number;
  holdings: MockHolding[];
}

export const SimulatedPortfolio: React.FC<SimulatedPortfolioProps> = ({
  virtualBalance,
  holdings
}) => {

  /**
   * Portfolio Value Calculations
   */
  const totalEquityValue = useMemo(() => {
    return holdings.reduce((sum, h) => sum + h.quantity * h.currentPrice, 0);
  }, [holdings]);

  const netPortfolioValue = useMemo(() => {
    return virtualBalance + totalEquityValue;
  }, [virtualBalance, totalEquityValue]);

  /**
   * Systematic Portfolio Concentration Resolver (35% exposure guardrail)
   */
  const maxConcentrationData = useMemo(() => {
    let maxWeight = 0;
    let maxTicker = "";

    if (netPortfolioValue > 0) {
      holdings.forEach((h) => {
        const weight = (h.quantity * h.currentPrice) / netPortfolioValue;
        if (weight > maxWeight) {
          maxWeight = weight;
          maxTicker = h.ticker;
        }
      });
    }

    return {
      exceedsLimit: maxWeight > 0.35,
      weightPercentage: parseFloat((maxWeight * 100).toFixed(1)),
      ticker: maxTicker
    };
  }, [holdings, netPortfolioValue]);

  /**
   * Healthometer Status String Resolver
   */
  const portfolioHealth = useMemo(() => {
    if (maxConcentrationData.exceedsLimit) {
      return "WEAKENING";
    }
    if (holdings.length === 0) {
      return "STABLE";
    }
    // Calculate simple overall PnL to decide health
    const costBasis = holdings.reduce((sum, h) => sum + h.quantity * h.averagePrice, 0);
    if (totalEquityValue >= costBasis) {
      return "VERY HEALTHY";
    }
    return "HEALTHY";
  }, [holdings, totalEquityValue, maxConcentrationData]);

  const isHealthyState = portfolioHealth === "VERY HEALTHY" || portfolioHealth === "HEALTHY" || portfolioHealth === "STABLE";

  return (
    <div className="bg-white border border-[#E5E5E5] p-6 rounded-none flex flex-col space-y-6 select-none">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
        <div className="flex items-center space-x-2">
          <PieChart className="w-4.5 h-4.5 text-[#06B6D4]" />
          <span className="text-[13px] uppercase tracking-wider font-semibold text-[#0A0A0A]">
            Simulated Margin Overview
          </span>
        </div>
        
        {/* Health status badge */}
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[9px] font-mono font-bold border ${
          isHealthyState
            ? "text-[#06B6D4] bg-[#06B6D4]/5 border-[#06B6D4]/10"
            : "text-[#D946EF] bg-[#D946EF]/5 border-[#D946EF]/10"
        }`}>
          {isHealthyState ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
          {portfolioHealth}
        </span>
      </div>

      {/* Margin Account Balances */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 bg-[#FAFAFA] border border-[#E5E5E5]">
          <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-wider block">
            Virtual Cash Bal
          </span>
          <span className="text-[15px] font-bold text-[#0A0A0A] font-mono block mt-1">
            ₹{virtualBalance.toLocaleString("en-IN")}
          </span>
        </div>

        <div className="p-3 bg-[#FAFAFA] border border-[#E5E5E5]">
          <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-wider block">
            Net Equity Val
          </span>
          <span className="text-[15px] font-bold text-[#0A0A0A] font-mono block mt-1">
            ₹{totalEquityValue.toLocaleString("en-IN")}
          </span>
        </div>
      </div>

      {/* Holdings List table */}
      <div className="space-y-2">
        <span className="text-[10px] font-mono font-medium text-neutral-400 uppercase tracking-widest block">
          Position List
        </span>
        
        <div className="divide-y divide-[#E5E5E5] border-t border-[#E5E5E5]">
          {holdings.length === 0 ? (
            <div className="py-6 text-center text-xs text-neutral-400 font-mono">
              NO VIRTUAL HOLDINGS HELD
            </div>
          ) : (
            holdings.map((h) => {
              const holdingCost = h.quantity * h.averagePrice;
              const holdingValue = h.quantity * h.currentPrice;
              const pnlValue = holdingValue - holdingCost;
              const pnlPercent = holdingCost > 0 ? (pnlValue / holdingCost) * 100 : 0;
              const isProfit = pnlValue >= 0;

              return (
                <div
                  key={h.ticker}
                  className="py-3 flex items-center justify-between text-xs text-[#0A0A0A]"
                >
                  <div className="flex flex-col">
                    <span className="font-bold font-mono text-neutral-800">{h.ticker}</span>
                    <span className="text-[9px] font-mono text-neutral-400">
                      QTY: {h.quantity} // AVG: ₹{h.averagePrice}
                    </span>
                  </div>
                  
                  <div className="flex flex-col text-right">
                    <span className="font-mono font-semibold">
                      ₹{holdingValue.toLocaleString("en-IN")}
                    </span>
                    <span className={`text-[10px] font-mono font-bold ${
                      isProfit ? "text-[#06B6D4]" : "text-[#D946EF]"
                    }`}>
                      {isProfit ? "+" : ""}
                      {pnlPercent.toFixed(2)}%
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Concentration risk alert */}
      {maxConcentrationData.exceedsLimit && (
        <div className="p-3 border border-[#D946EF]/20 bg-[#D946EF]/5 text-[#D946EF] flex items-center space-x-2 rounded-none">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <div className="text-[10px] font-mono leading-tight uppercase font-semibold">
            CONCENTRATION RISK: {maxConcentrationData.ticker} EXCEEDS 35% CAP ({maxConcentrationData.weightPercentage}%)
          </div>
        </div>
      )}

    </div>
  );
};

export default SimulatedPortfolio;
