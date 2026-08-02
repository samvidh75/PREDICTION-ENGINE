import type { CompanyMetadata } from '../data/types';

export interface MetadataProvider {
  getMetadata(symbol: string): Promise<CompanyMetadata>;
}
