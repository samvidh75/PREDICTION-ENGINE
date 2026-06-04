// src/services/providers/MetadataProvider.ts
import { CompanyMetadata } from '../data/types';

export interface MetadataProvider {
  getMetadata(symbol: string): Promise<CompanyMetadata>;
}
