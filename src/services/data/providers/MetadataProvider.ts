// src/services/data/providers/MetadataProvider.ts
import { CompanyMetadata } from '../types';

export interface MetadataProvider {
  getMetadata(symbol: string): Promise<CompanyMetadata>;
}

export class MockMetadataProvider implements MetadataProvider {
  public async getMetadata(symbol: string): Promise<CompanyMetadata> {
    const sym = symbol.toUpperCase();
    const mockDetails: Record<string, CompanyMetadata> = {
      RELIANCE: { symbol: 'RELIANCE', companyName: 'Reliance Industries Limited', sector: 'Energy & Oil', industry: 'Conglomerate', marketCap: 1845000 },
      HAL: { symbol: 'HAL', companyName: 'Hindustan Aeronautics Limited', sector: 'Defence & Aerospace', industry: 'Aerospace Systems', marketCap: 245000 },
      BEL: { symbol: 'BEL', companyName: 'Bharat Electronics Limited', sector: 'Defence & Electronics', industry: 'Systems Contractor', marketCap: 165000 },
    };

    return mockDetails[sym] || {
      symbol: sym,
      companyName: `${sym} Corp Ltd`,
      sector: 'General Manufacturing',
      industry: 'Heavy Industries',
      marketCap: 12000,
    };
  }
}
