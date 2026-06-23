import type { StockIntelligenceSnapshot, SuperScanResult, IntelligenceIngestionRun, DashboardSnapshot } from '../../../shared/intelligence/IndianApiPremiumTypes';
import { StockIntelligenceRepository } from './StockIntelligenceRepository';

export class StockIntelligenceService {
  private repo: StockIntelligenceRepository;

  constructor(repo: StockIntelligenceRepository) {
    this.repo = repo;
  }

  async getLiveSnapshot(symbol: string): Promise<StockIntelligenceSnapshot | null> {
    return this.repo.getLiveSnapshot(symbol);
  }

  async getDashboard(limit: number = 50): Promise<DashboardSnapshot> {
    return this.repo.getDashboard(limit);
  }

  async getSnapshots(symbol: string, limit: number = 30): Promise<StockIntelligenceSnapshot[]> {
    return this.repo.getHistory(symbol, limit);
  }

  async getSuperScans(): Promise<{ scanKey: string; scanLabel: string; count: number }[]> {
    return this.repo.getSuperScans();
  }

  async getSuperScan(scanKey: string): Promise<SuperScanResult[]> {
    return this.repo.getSuperScan(scanKey);
  }

  async getIngestionStatus(): Promise<IntelligenceIngestionRun | null> {
    return this.repo.getIngestionStatus();
  }

  formatSnapshotForPublic(snapshot: StockIntelligenceSnapshot): any {
    const externalContext = snapshot.analystView !== 'not_available' || snapshot.externalTargetPrice !== null
      ? {
          analystTone: snapshot.analystView,
          upsideContext: snapshot.externalUpsidePercent,
        }
      : undefined;

    return {
      symbol: snapshot.symbol,
      companyName: snapshot.companyName,
      price: snapshot.price,
      changePercent: snapshot.changePercent,
      peRatio: snapshot.peRatio,
      pbRatio: snapshot.pbRatio,
      marketCap: snapshot.marketCap,
      promoterHolding: snapshot.promoterHolding,
      fiiHolding: snapshot.fiiHolding,
      diiHolding: snapshot.diiHolding,
      externalContext,
      latestHeadline: snapshot.latestHeadline,
      completenessScore: snapshot.completenessScore,
      sourceState: snapshot.sourceState,
      updatedAt: snapshot.updatedAt,
    };
  }
}
