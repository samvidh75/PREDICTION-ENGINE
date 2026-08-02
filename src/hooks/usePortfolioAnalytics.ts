import { useState, useEffect, useCallback } from 'react';
import { portfolioStore, PortfolioPosition } from '../services/portfolio/portfolioStore';

interface PositionWithPnL extends PortfolioPosition {
  currentPrice: number;
  invested: number;
  current: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  realizedPnL: number;
}

interface PortfolioSummary {
  totalInvested: number;
  totalCurrent: number;
  totalUnrealizedPnL: number;
  totalUnrealizedPnLPercent: number;
  totalRealizedPnL: number;
  sectorAllocation: Record<string, number>;
  topPerformers: PositionWithPnL[];
  worstPerformers: PositionWithPnL[];
  positions: PositionWithPnL[];
}

export function usePortfolioAnalytics(prices: Record<string, number>): PortfolioSummary {
  const [positions, setPositions] = useState<PositionWithPnL[]>([]);

  useEffect(() => {
    loadPositions(prices).then(setPositions);
  }, [prices]);

  const totalInvested = positions.reduce((s, p) => s + p.invested, 0);
  const totalCurrent = positions.reduce((s, p) => s + p.current, 0);
  const totalUnrealizedPnL = positions.reduce((s, p) => s + p.unrealizedPnL, 0);
  const totalUnrealizedPnLPercent = totalInvested > 0 ? (totalUnrealizedPnL / totalInvested) * 100 : 0;
  const totalRealizedPnL = positions.reduce((s, p) => s + p.realizedPnL, 0);

  const sectorAllocation = positions.reduce<Record<string, number>>((acc, p) => {
    const sector = p.notes?.split('|')[0]?.trim() || 'Other';
    acc[sector] = (acc[sector] || 0) + p.current;
    return acc;
  }, {});

  const sorted = [...positions].sort((a, b) => b.unrealizedPnLPercent - a.unrealizedPnLPercent);
  const topPerformers = sorted.slice(0, 5);
  const worstPerformers = sorted.slice(-5).reverse();

  return {
    totalInvested, totalCurrent, totalUnrealizedPnL, totalUnrealizedPnLPercent, totalRealizedPnL,
    sectorAllocation, topPerformers, worstPerformers, positions,
  };
}

async function loadPositions(prices: Record<string, number>): Promise<PositionWithPnL[]> {
  const positions = await portfolioStore.getPositions();
  const enriched: PositionWithPnL[] = [];

  for (const pos of positions) {
    const currentPrice = prices[pos.symbol] ?? 0;
    const pnl = await portfolioStore.calculatePnL(pos.id, currentPrice);
    enriched.push({ ...pos, ...pnl, currentPrice });
  }

  return enriched;
}

export function useRefreshPortfolio(): () => Promise<void> {
  return useCallback(async () => {
    await portfolioStore.init();
  }, []);
}
