import pool from '../db/index';

export interface RiskItem {
  category: string;
  risk: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

export interface RiskNarrative {
  symbol: string;
  overall_risk_level: 'Low' | 'Moderate' | 'High' | 'Critical';
  risks: RiskItem[];
}

export class RiskNarrativeEngine {
  async generateRiskNarrative(symbol: string): Promise<RiskNarrative> {
    const risks: RiskItem[] = [];

    const [factRes, featRes, finRes, sectorRes] = await Promise.all([
      pool.query(`SELECT * FROM factor_snapshots WHERE symbol = $1 ORDER BY trade_date DESC LIMIT 1`, [symbol]),
      pool.query(`SELECT * FROM feature_snapshots WHERE symbol = $1 ORDER BY trade_date DESC LIMIT 1`, [symbol]),
      pool.query(`SELECT * FROM financial_snapshots WHERE symbol = $1 ORDER BY period_end DESC LIMIT 1`, [symbol]),
      pool.query(`SELECT sector FROM symbols WHERE symbol = $1`, [symbol]),
    ]);

    const fact = factRes.rows[0];
    const feat = featRes.rows[0];
    const fin = finRes.rows[0];
    const sector = sectorRes.rows[0]?.sector;

    if (!fact && !feat && !fin) {
      return { symbol, overall_risk_level: 'Moderate', risks: [{
        category: 'Data', risk: 'Insufficient Data', severity: 'medium',
        description: `No factor, feature, or financial data available for ${symbol}. Cannot assess risks.`
      }] };
    }

    // Business Risks
    if (fin) {
      const dte = Number(fin.debt_to_equity || 0);
      if (dte > 2) {
        risks.push({ category: 'Business', risk: 'High Leverage', severity: 'high',
          description: `Debt-to-equity of ${dte.toFixed(2)} exceeds prudent thresholds. High financial leverage increases default risk during earnings downturns.` });
      } else if (dte > 1) {
        risks.push({ category: 'Business', risk: 'Elevated Leverage', severity: 'medium',
          description: `Debt-to-equity of ${dte.toFixed(2)} is above 1.0. Monitor debt servicing capacity.` });
      }
    }

    if (fact) {
      const qf = Number(fact.quality_factor || 50);
      if (qf < 30) {
        risks.push({ category: 'Business', risk: 'Low Quality Score', severity: 'high',
          description: `Quality factor of ${qf.toFixed(0)}/100 indicates weak fundamentals — low ROE, ROIC, and margins relative to peers.` });
      }

      const rf = Number(fact.risk_factor || 50);
      if (rf > 75) {
        risks.push({ category: 'Business', risk: 'Elevated Risk Profile', severity: 'high',
          description: `Risk factor of ${rf.toFixed(0)}/100 signals above-average business and financial risk.` });
      }
    }

    // Financial Risks
    if (fin) {
      const roa = Number(fin.roa);
      const roe = Number(fin.roe);
      if (!isNaN(roa) && roa < 0) {
        risks.push({ category: 'Financial', risk: 'Negative ROA', severity: 'critical',
          description: `Return on assets of ${(roa*100).toFixed(1)}% — the company is not generating returns on its asset base.` });
      }
      if (!isNaN(roe) && roe < 0) {
        risks.push({ category: 'Financial', risk: 'Negative ROE', severity: 'critical',
          description: `Return on equity is negative — shareholder value is being eroded.` });
      }
    }

    // Momentum Risks
    if (fact) {
      const mf = Number(fact.momentum_factor || 50);
      if (mf < 30) {
        risks.push({ category: 'Momentum', risk: 'Weakening Momentum', severity: 'medium',
          description: `Momentum factor at ${mf.toFixed(0)}/100 indicates deteriorating price trends and weak institutional follow-through.` });
      }
    }

    if (feat) {
      const vol = Number(feat.volatility || 0.25);
      if (vol > 70) {
        risks.push({ category: 'Momentum', risk: 'High Volatility', severity: 'high',
          description: `Current volatility reading of ${vol.toFixed(1)} suggests wider-than-normal price swings, increasing drawdown risk.` });
      }
    }

    // Volatility / Technical Risks
    if (feat) {
      const atr = feat.atr != null ? Number(feat.atr) : null;
      const bw = feat.bollinger_width != null ? Number(feat.bollinger_width) : null;
      if (bw && bw > 80) {
        risks.push({ category: 'Volatility', risk: 'Elevated Bollinger Width', severity: 'medium',
          description: `Bollinger band width of ${bw.toFixed(1)} suggests the stock is overextended with elevated mean-reversion risk.` });
      }
    }

    // Concentration Risks
    if (sector) {
      try {
        const concRes = await pool.query(
          `SELECT COUNT(*)::float / (SELECT COUNT(*) FROM symbols WHERE listing_status = 'active') AS pct
           FROM symbols WHERE sector = $1 AND listing_status = 'active'`, [sector]
        );
        const pct = Number(concRes.rows[0]?.pct || 0) * 100;
        if (pct > 20) {
          risks.push({ category: 'Concentration', risk: 'Sector Concentration', severity: 'low',
            description: `${sector} accounts for ${pct.toFixed(1)}% of active universe — broad sector exposure may amplify systemic risk.` });
        }
      } catch { /* skip concentration check if symbols table unavailable */ }
    }

    // Determine overall risk level
    const severityMap = { critical: 4, high: 3, medium: 2, low: 1 };
    const maxSev = risks.reduce((max, r) => Math.max(max, severityMap[r.severity]), 0);
    let overall: RiskNarrative['overall_risk_level'];
    if (maxSev >= 4) overall = 'Critical';
    else if (maxSev >= 3) overall = 'High';
    else if (maxSev >= 2) overall = 'Moderate';
    else overall = 'Low';

    return { symbol, overall_risk_level: overall, risks };
  }
}

export const riskNarrativeEngine = new RiskNarrativeEngine();
export default RiskNarrativeEngine;
