/**
 * AnalystContext — loads structured context for analyst workflows.
 * Deterministic; no invented data. Missing fields produce limitations.
 */

import type { ResearchEvidence } from '../../intelligence/evidence/EvidenceTypes';
import type { IntelligenceInput } from '../../intelligence/types';

export interface CompanyContext {
  symbol: string;
  companyName: string | null;
  sector: string | null;
  industry: string | null;
  intelligenceInput: IntelligenceInput | null;
  evidence: ResearchEvidence[];
  documentsAvailable: boolean;
  filingsAvailable: boolean;
  priorReviewAt: string | null;
  limitations: string[];
}

export interface SectorContext {
  sector: string;
  symbols: string[];
  evidence: ResearchEvidence[];
  limitations: string[];
}

export interface AnalystContextLoader {
  loadCompany(symbol: string): Promise<CompanyContext>;
  loadSector(sector: string): Promise<SectorContext>;
  loadWatchlistSymbols(userId?: string): Promise<string[]>;
}

function baseIntelligenceInput(symbol: string): IntelligenceInput {
  return {
    symbol: symbol.toUpperCase(),
    exchange: 'NSE_EQ',
    tradeDate: new Date().toISOString().slice(0, 10),
    financials: {},
    technicals: {},
    earnings: {},
    sentiment: {},
    sector: {},
    risks: {},
  } as IntelligenceInput;
}

export class InMemoryAnalystContextLoader implements AnalystContextLoader {
  private companyOverrides = new Map<string, Partial<CompanyContext>>();

  setCompanyContext(symbol: string, ctx: Partial<CompanyContext>): void {
    this.companyOverrides.set(symbol.toUpperCase(), ctx);
  }

  async loadCompany(symbol: string): Promise<CompanyContext> {
    const sym = symbol.toUpperCase();
    const override = this.companyOverrides.get(sym);
    const limitations: string[] = [];

    if (!override?.intelligenceInput) {
      limitations.push('Limited structured metrics available for this company.');
    }
    if (!override?.documentsAvailable) {
      limitations.push('Research documents may be limited.');
    }

    return {
      symbol: sym,
      companyName: override?.companyName ?? null,
      sector: override?.sector ?? null,
      industry: override?.industry ?? null,
      intelligenceInput: override?.intelligenceInput ?? baseIntelligenceInput(sym),
      evidence: override?.evidence ?? [],
      documentsAvailable: override?.documentsAvailable ?? false,
      filingsAvailable: override?.filingsAvailable ?? false,
      priorReviewAt: override?.priorReviewAt ?? null,
      limitations: [...limitations, ...(override?.limitations ?? [])],
    };
  }

  async loadSector(sector: string): Promise<SectorContext> {
    return {
      sector,
      symbols: [],
      evidence: [],
      limitations: ['Sector peer data may be limited.'],
    };
  }

  async loadWatchlistSymbols(_userId?: string): Promise<string[]> {
    return [];
  }
}

export const defaultAnalystContextLoader = new InMemoryAnalystContextLoader();
