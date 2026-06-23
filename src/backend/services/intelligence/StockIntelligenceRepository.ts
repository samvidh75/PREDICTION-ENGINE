import type { StockIntelligenceSnapshot, SuperScanResult, IntelligenceIngestionRun, DashboardSnapshot } from '../../../shared/intelligence/IndianApiPremiumTypes';

export interface DbSnapshotRow {
  symbol: string;
  company_name: string | null;
  as_of: string | null;
  price: number | null;
  change_percent: number | null;
  pe_ratio: number | null;
  pb_ratio: number | null;
  market_cap: number | null;
  roe: number | null;
  roce: number | null;
  debt_to_equity: number | null;
  revenue_growth: number | null;
  profit_growth: number | null;
  operating_margin: number | null;
  net_margin: number | null;
  promoter_holding: number | null;
  fii_holding: number | null;
  dii_holding: number | null;
  analyst_view: string;
  analyst_view_raw: string | null;
  external_target_price: number | null;
  external_upside_percent: number | null;
  latest_headline: string | null;
  latest_headline_url: string | null;
  source_state: string;
  completeness_score: number;
  updated_at: string;
}

export interface DbScanRow {
  scan_key: string;
  scan_label: string;
  symbol: string;
  rank: number;
  score: number;
  reason: string;
  data_quality: string;
  generated_at: string;
}

export interface DbIngestionRunRow {
  id: number;
  status: string;
  symbols_requested: number;
  symbols_succeeded: number;
  symbols_failed: number;
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
}

function mapSnapshot(row: DbSnapshotRow): StockIntelligenceSnapshot {
  return {
    symbol: row.symbol,
    companyName: row.company_name,
    asOf: row.as_of || row.updated_at,
    price: row.price,
    changePercent: row.change_percent,
    peRatio: row.pe_ratio,
    pbRatio: row.pb_ratio,
    marketCap: row.market_cap,
    roe: row.roe,
    roce: row.roce,
    debtToEquity: row.debt_to_equity,
    revenueGrowth: row.revenue_growth,
    profitGrowth: row.profit_growth,
    operatingMargin: row.operating_margin,
    netMargin: row.net_margin,
    promoterHolding: row.promoter_holding,
    fiiHolding: row.fii_holding,
    diiHolding: row.dii_holding,
    analystView: (row.analyst_view as any) || 'not_available',
    analystViewRaw: row.analyst_view_raw,
    externalTargetPrice: row.external_target_price,
    externalUpsidePercent: row.external_upside_percent,
    latestHeadline: row.latest_headline,
    latestHeadlineUrl: row.latest_headline_url,
    sourceState: (row.source_state as any) || 'missing',
    completenessScore: row.completeness_score,
    updatedAt: row.updated_at,
  };
}

export class StockIntelligenceRepository {
  private db: any;

  constructor(db: any) {
    this.db = db;
  }

  async getLiveSnapshot(symbol: string): Promise<StockIntelligenceSnapshot | null> {
    const result = await this.db.query(
      'SELECT * FROM stock_live_snapshot WHERE symbol = $1',
      [symbol.toUpperCase()],
    );
    if (!result.rows?.length) return null;
    return mapSnapshot(result.rows[0]);
  }

  async getLiveSnapshots(limit: number = 100): Promise<StockIntelligenceSnapshot[]> {
    const result = await this.db.query(
      'SELECT * FROM stock_live_snapshot WHERE source_state != $1 ORDER BY completeness_score DESC LIMIT $2',
      ['error', limit],
    );
    return (result.rows || []).map(mapSnapshot);
  }

  async getSnapshotsByState(state: string, limit: number = 50): Promise<StockIntelligenceSnapshot[]> {
    const result = await this.db.query(
      'SELECT * FROM stock_live_snapshot WHERE source_state = $1 ORDER BY completeness_score DESC LIMIT $2',
      [state, limit],
    );
    return (result.rows || []).map(mapSnapshot);
  }

  async getHistory(symbol: string, limit: number = 30): Promise<StockIntelligenceSnapshot[]> {
    const result = await this.db.query(
      'SELECT * FROM stock_intelligence_history WHERE symbol = $1 ORDER BY snapshot_date DESC LIMIT $2',
      [symbol.toUpperCase(), limit],
    );
    return (result.rows || []).map(mapSnapshot);
  }

  async getDashboard(limit: number = 50): Promise<DashboardSnapshot> {
    const countResult = await this.db.query('SELECT COUNT(*) as total FROM stock_live_snapshot');
    const availResult = await this.db.query("SELECT COUNT(*) as total FROM stock_live_snapshot WHERE source_state = 'available'");
    const symbols = await this.getLiveSnapshots(limit);
    return {
      symbols,
      totalTracked: parseInt(countResult.rows?.[0]?.total || '0', 10),
      availableCount: parseInt(availResult.rows?.[0]?.total || '0', 10),
      updatedAt: new Date().toISOString(),
    };
  }

  async getSuperScans(): Promise<{ scanKey: string; scanLabel: string; count: number }[]> {
    const result = await this.db.query(
      `SELECT scan_key, scan_label, COUNT(*) as count
       FROM stock_super_scan_results
       WHERE generated_at = (SELECT MAX(generated_at) FROM stock_super_scan_results)
       GROUP BY scan_key, scan_label
       ORDER BY scan_label`,
    );
    return (result.rows || []).map((r: any) => ({
      scanKey: r.scan_key,
      scanLabel: r.scan_label,
      count: parseInt(r.count, 10),
    }));
  }

  async getSuperScan(scanKey: string): Promise<SuperScanResult[]> {
    const result = await this.db.query(
      `SELECT scan_key, scan_label, symbol, rank, score, reason, data_quality, generated_at
       FROM stock_super_scan_results
       WHERE scan_key = $1
         AND generated_at = (SELECT MAX(generated_at) FROM stock_super_scan_results WHERE scan_key = $1)
       ORDER BY rank ASC
       LIMIT 50`,
      [scanKey],
    );
    return (result.rows || []).map((r: DbScanRow) => ({
      scanKey: r.scan_key,
      scanLabel: r.scan_label,
      symbol: r.symbol,
      rank: r.rank,
      score: r.score,
      reason: r.reason,
      dataQuality: r.data_quality,
      generatedAt: r.generated_at,
    }));
  }

  async getIngestionStatus(): Promise<IntelligenceIngestionRun | null> {
    const result = await this.db.query(
      'SELECT * FROM stock_intelligence_ingestion_runs ORDER BY started_at DESC LIMIT 1',
    );
    if (!result.rows?.length) return null;
    const r = result.rows[0] as DbIngestionRunRow;
    return {
      id: r.id,
      status: r.status,
      symbolsRequested: r.symbols_requested,
      symbolsSucceeded: r.symbols_succeeded,
      symbolsFailed: r.symbols_failed,
      startedAt: r.started_at,
      completedAt: r.completed_at,
      errorMessage: r.error_message,
    };
  }
}

export function createStockIntelligenceRepository(db: any): StockIntelligenceRepository {
  return new StockIntelligenceRepository(db);
}
