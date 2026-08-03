// src/services/data/providers/MetadataProvider.ts
import { CompanyMetadata } from '../types';

export interface MetadataProvider {
  getMetadata(symbol: string): Promise<CompanyMetadata>;
}

export class MockMetadataProvider implements MetadataProvider {
  public async getMetadata(symbol: string): Promise<CompanyMetadata> {
    const sym = symbol.toUpperCase();
    const mockDetails: Record<string, CompanyMetadata> = {
      BDO: { symbol: 'BDO', companyName: 'BDO Unibank Inc', sector: 'Financial', industry: 'Banking', marketCap: 1845000 },
      AC: { symbol: 'AC', companyName: 'Ayala Corporation', sector: 'Holding Firms', industry: 'Diversified Conglomerate', marketCap: 245000 },
      TEL: { symbol: 'TEL', companyName: 'PLDT Inc', sector: 'Services', industry: 'Telecommunications', marketCap: 165000 },
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
