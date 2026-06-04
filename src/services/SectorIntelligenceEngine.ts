// src/services/SectorIntelligenceEngine.ts
// Production Sector Intelligence Engine.
// Generates Sector Strength, Sector Momentum, Sector Risk, and Sector Rotation Signals.

import { query } from "../db/index";

export interface SectorIntelligence {
  sector: string;
  sectorStrength: number; // 0-100
  sectorMomentum: "Accelerating" | "Steady" | "Decelerating";
  sectorRisk: "Low" | "Moderate" | "High";
  sectorRotationSignal: "ACCUMULATE" | "HOLD" | "REDUCE";
}

export class SectorIntelligenceEngine {
  async generateSectorReport(sector: string): Promise<SectorIntelligence> {
    // Query sector averages for daily return volatility and returns
    const res = await query(
      `SELECT AVG(fs.sector_strength_factor) as avg_strength,
              AVG(fs.momentum_factor) as avg_momentum,
              AVG(fs.risk_factor) as avg_risk
       FROM factor_snapshots fs
       JOIN symbols s ON fs.symbol = s.symbol
       WHERE s.sector = $1`,
      [sector]
    );

    const row = res.rows[0];
    const strength = row.avg_strength ? Math.round(Number(row.avg_strength)) : 50;
    const momentumScore = row.avg_momentum ? Math.round(Number(row.avg_momentum)) : 50;
    const riskScore = row.avg_risk ? Math.round(Number(row.avg_risk)) : 50;

    let sectorMomentum: "Accelerating" | "Steady" | "Decelerating" = "Steady";
    if (momentumScore >= 60) sectorMomentum = "Accelerating";
    else if (momentumScore <= 40) sectorMomentum = "Decelerating";

    let sectorRisk: "Low" | "Moderate" | "High" = "Moderate";
    // Risk factor score high means higher safety (so lower risk)
    if (riskScore >= 60) sectorRisk = "Low";
    else if (riskScore <= 40) sectorRisk = "High";

    let sectorRotationSignal: "ACCUMULATE" | "HOLD" | "REDUCE" = "HOLD";
    if (strength >= 60 && sectorMomentum === "Accelerating") {
      sectorRotationSignal = "ACCUMULATE";
    } else if (strength <= 40 || sectorMomentum === "Decelerating") {
      sectorRotationSignal = "REDUCE";
    }

    return {
      sector,
      sectorStrength: strength,
      sectorMomentum,
      sectorRisk,
      sectorRotationSignal,
    };
  }
}

export const sectorIntelligenceEngine = new SectorIntelligenceEngine();
export default sectorIntelligenceEngine;
