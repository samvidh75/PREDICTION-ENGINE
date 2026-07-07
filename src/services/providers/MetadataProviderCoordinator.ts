/**
 * MetadataProviderCoordinator — Intelligent metadata resolution with fallback enrichment.
 *
 * Problem: Providers often return blank sectors, null market caps, ticker-as-company-name,
 * raw PSE codes, and lack ISIN support.
 *
 * Solution: This coordinator sits between the provider chain and consumers. It:
 *   1. Calls the standard ProviderCoordinator chain (Yahoo → IndianMarket)
 *   2. Validates the result via CompanyDataValidator
 *   3. Enriches missing fields from a master company registry
 *   4. Applies DataIntegrityEngine to normalise PSE codes, ISIN format, etc.
 *
 * This is the SINGLE entry point for all metadata retrieval throughout the app.
 */

import { CompanyMetadata } from '../data/types';
import { ProviderCoordinator } from './ProviderCoordinator';
import { CompanyDataValidator, ValidationResult } from '../data/CompanyDataValidator';
import { DataIntegrityEngine } from '../data/DataIntegrityEngine';
import { MasterCompanyRegistry } from '../data/MasterCompanyRegistry';

export interface EnrichedMetadata extends CompanyMetadata {
  isin: string | null;
  bseCode: string | null;
  nseSymbol: string | null;
  verificationStatus: 'VERIFIED' | 'PARTIAL' | 'INVALID';
  verificationReasons: string[];
  enrichmentSource: 'provider' | 'registry' | 'fallback';
}

/**
 * Infer exchange only from an explicit exchange suffix. A bare symbol does not
 * prove its venue, so callers must keep the exchange unavailable in that case.
 */
export function inferExchangeFromSymbol(symbol: string): CompanyMetadata['exchange'] | undefined {
  const normalized = symbol.trim().toUpperCase();
  if (/\.(NS|PSE)$/.test(normalized)) return 'PSE';
  if (/\.(BO|PSE)$/.test(normalized)) return 'PSE';
  return undefined;
}

export class MetadataProviderCoordinator {
  private static providerCoordinator = new ProviderCoordinator();
  private static validator = new CompanyDataValidator();
  private static integrity = new DataIntegrityEngine();
  private static registry = MasterCompanyRegistry.getInstance();

  static async getMetadata(symbol: string): Promise<EnrichedMetadata> {
    const rawSymbol = symbol.toUpperCase().trim();
    let raw: CompanyMetadata | null = null;
    let enrichmentSource: EnrichedMetadata['enrichmentSource'] = 'provider';

    // 1. Try the local verified company master registry first (highest priority)
    const registryEntry = this.registry.lookup(rawSymbol);
    if (registryEntry) {
      raw = {
        symbol: registryEntry.nseSymbol || registryEntry.symbol,
        companyName: registryEntry.companyName,
        sector: registryEntry.sector,
        industry: registryEntry.industry,
        exchange: registryEntry.exchange,
        marketCap: registryEntry.marketCap,
        currency: registryEntry.currency || 'INR',
        website: registryEntry.website || '',
        isin: registryEntry.isin ?? null,
        bseCode: registryEntry.bseCode ?? null,
        nseSymbol: registryEntry.nseSymbol ?? registryEntry.symbol,
      };
      enrichmentSource = 'registry';
    }

    // 2. Try the provider chain if not found in local registry
    if (!raw) {
      try {
        raw = await this.providerCoordinator.getMetadata(rawSymbol);
      } catch {
        // Fall through
      }
    }

    // 3. If still nothing or invalid, use structured fallback but DO NOT use ticker as name or return fake values.
    if (!raw) {
      raw = {
        symbol: rawSymbol,
        companyName: '', // Left blank so validator flags it, never use ticker as company name
        sector: '',
        industry: '',
        exchange: inferExchangeFromSymbol(rawSymbol),
        marketCap: undefined,
        currency: 'INR',
        website: '',
      };
      enrichmentSource = 'fallback';
    }

    // 4. Validate raw provider output
    const rawValidation = this.validator.validate(raw);

    // 5. Enrich from registry if validation found gaps
    let enriched = this.enrichFromRegistry(raw, rawValidation);

    // 6. Apply integrity normalisation (PSE codes, ISIN, ticker cleanup)
    enriched = this.integrity.normalise(enriched);

    // 7. Build the enriched result from the final, normalised payload.
    const registryMatch = this.registry.lookup(enriched.symbol) ?? this.registry.lookup(rawSymbol);
    const finalMetadata: CompanyMetadata = {
      ...enriched,
      symbol: registryMatch?.nseSymbol ?? registryMatch?.symbol ?? enriched.symbol,
      companyName: enriched.companyName || registryMatch?.companyName || '',
      sector: enriched.sector || registryMatch?.sector || '',
      industry: enriched.industry || registryMatch?.industry || '',
      exchange: enriched.exchange || registryMatch?.exchange || inferExchangeFromSymbol(rawSymbol),
      marketCap: enriched.marketCap ?? registryMatch?.marketCap,
      currency: enriched.currency || registryMatch?.currency || 'INR',
      website: enriched.website || registryMatch?.website || '',
      isin: enriched.isin ?? registryMatch?.isin ?? null,
      bseCode: enriched.bseCode ?? registryMatch?.bseCode ?? null,
      nseSymbol: enriched.nseSymbol ?? registryMatch?.nseSymbol ?? registryMatch?.symbol ?? enriched.symbol,
    };
    const finalValidation = this.validator.validate(finalMetadata);

    return {
      ...finalMetadata,
      isin: finalMetadata.isin ?? null,
      bseCode: finalMetadata.bseCode ?? null,
      nseSymbol: finalMetadata.nseSymbol ?? rawSymbol.replace(/\.(NS|BO|PSE|PSE)$/i, ''),
      verificationStatus: finalValidation.status,
      verificationReasons: finalValidation.reasons,
      enrichmentSource,
    };
  }

  /**
   * Batch metadata retrieval — resolves all symbols in parallel.
   */
  static async getMetadataBatch(symbols: string[]): Promise<Map<string, EnrichedMetadata>> {
    const results = new Map<string, EnrichedMetadata>();
    const promises = symbols.map(async (symbol) => {
      const metadata = await this.getMetadata(symbol);
      results.set(symbol.toUpperCase().trim(), metadata);
    });
    await Promise.allSettled(promises);
    return results;
  }

  /**
   * Enrich metadata fields from the master registry if validation flagged them as missing.
   */
  private static enrichFromRegistry(
    meta: CompanyMetadata,
    validation: ValidationResult,
  ): CompanyMetadata {
    const enriched = { ...meta };
    const entry = this.registry.lookup(meta.symbol);

    if (!entry) return enriched;

    // Fill gaps from registry
    if (validation.reasons.includes('missing_company_name') || enriched.companyName === enriched.symbol) {
      enriched.companyName = entry.companyName;
    }
    if (validation.reasons.includes('raw_bse_code_as_symbol')) {
      enriched.symbol = entry.nseSymbol || entry.symbol;
    }
    if (validation.reasons.includes('missing_sector') || !enriched.sector) {
      enriched.sector = entry.sector;
    }
    if (validation.reasons.includes('missing_industry') || !enriched.industry) {
      enriched.industry = entry.industry;
    }
    if (validation.reasons.includes('missing_market_cap') || enriched.marketCap == null) {
      enriched.marketCap = entry.marketCap;
    }
    if (!enriched.exchange) {
      enriched.exchange = entry.exchange;
    }
    enriched.currency = enriched.currency || entry.currency || 'INR';
    enriched.website = enriched.website || entry.website || '';
    enriched.isin = enriched.isin ?? entry.isin ?? null;
    enriched.bseCode = enriched.bseCode ?? entry.bseCode ?? null;
    enriched.nseSymbol = enriched.nseSymbol ?? entry.nseSymbol ?? entry.symbol;

    return enriched;
  }
}
