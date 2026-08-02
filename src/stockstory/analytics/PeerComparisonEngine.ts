import type { LensoryOutput } from '../types';

export interface PeerComparison {
  symbol: string;
  companyName: string;
  sector: string;
  healthScore: number;
  averagePeerHealth: number;
  relativeStrength: number;
  strongerThanPeers: boolean;
  topPeers: Array<{ symbol: string; companyName: string; healthScore: number }>;
}

export class PeerComparisonEngine {
  static compare(
    targetSymbol: string,
    entries: Array<{
      symbol: string;
      companyName: string;
      sector: string;
      output: LensoryOutput;
    }>
  ): PeerComparison | null {
    const target = entries.find((entry) => entry.symbol === targetSymbol);
    if (!target) return null;

    const peers = entries
      .filter((entry) => entry.sector === target.sector && entry.symbol !== target.symbol)
      .sort((a, b) => b.output.healthScore - a.output.healthScore);

    const averagePeerHealth = peers.length
      ? Number((peers.reduce((sum, peer) => sum + peer.output.healthScore, 0) / peers.length).toFixed(1))
      : target.output.healthScore;

    return {
      symbol: target.symbol,
      companyName: target.companyName,
      sector: target.sector,
      healthScore: target.output.healthScore,
      averagePeerHealth,
      relativeStrength: Number((target.output.healthScore - averagePeerHealth).toFixed(1)),
      strongerThanPeers: target.output.healthScore >= averagePeerHealth,
      topPeers: peers.slice(0, 5).map((peer) => ({
        symbol: peer.symbol,
        companyName: peer.companyName,
        healthScore: peer.output.healthScore,
      })),
    };
  }
}

export default PeerComparisonEngine;
