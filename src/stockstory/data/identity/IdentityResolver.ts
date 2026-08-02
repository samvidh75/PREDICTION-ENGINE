/**
 * Company Identity Resolver
 *
 * Resolves company identities from multiple data sources.
 * Produces a unified CompanyIdentity with cross-referenced identifiers.
 */

import type { CompanyIdentity, ExchangeListing, IndustryClassification } from './IdentityTypes';
import { symbolMaster } from './SymbolMaster';
import { aliasResolver } from './AliasResolver';

export interface IdentityProvider {
  name: string;
  resolveByCIN?(cin: string): Promise<Partial<CompanyIdentity> | null>;
  resolveByISIN?(isin: string): Promise<Partial<CompanyIdentity> | null>;
  resolveBySymbol?(symbol: string): Promise<Partial<CompanyIdentity> | null>;
  resolveByPAN?(pan: string): Promise<Partial<CompanyIdentity> | null>;
  available(): boolean;
}

export class IdentityResolver {
  private providers: IdentityProvider[] = [];
  private cache: Map<string, CompanyIdentity> = new Map();

  constructor(providers: IdentityProvider[] = []) {
    this.providers = providers;
  }

  async resolveByIdentifier(
    value: string,
    type: 'cin' | 'isin' | 'symbol' | 'pan'
  ): Promise<CompanyIdentity | null> {
    const cacheKey = `${type}:${value.toUpperCase()}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const fragments: Partial<CompanyIdentity>[] = [];

    for (const provider of this.providers) {
      if (!provider.available()) continue;
      try {
        let result: Partial<CompanyIdentity> | null = null;
        switch (type) {
          case 'cin': result = await provider.resolveByCIN?.(value) ?? null; break;
          case 'isin': result = await provider.resolveByISIN?.(value) ?? null; break;
          case 'symbol': result = await provider.resolveBySymbol?.(value) ?? null; break;
          case 'pan': result = await provider.resolveByPAN?.(value) ?? null; break;
        }
        if (result) fragments.push(result);
      } catch {
        // Provider failed — skip
      }
    }

    if (fragments.length === 0) return null;

    const identity = this.mergeFragments(fragments, type, value);
    this.cache.set(cacheKey, identity);
    return identity;
  }

  private mergeFragments(
    fragments: Partial<CompanyIdentity>[],
    lookupType: string,
    lookupValue: string
  ): CompanyIdentity {
    const merged: CompanyIdentity = {
      companyId: fragments.find(f => f.companyId)?.companyId ?? `${lookupType}:${lookupValue.toUpperCase()}`,
      legalName: fragments.find(f => f.legalName)?.legalName ?? '',
      displayName: fragments.find(f => f.displayName)?.displayName ?? '',
      aliases: [],
      cin: fragments.find(f => f.cin)?.cin ?? null,
      pan: fragments.find(f => f.pan)?.pan ?? null,
      gstin: fragments.find(f => f.gstin)?.gstin ?? null,
      lei: fragments.find(f => f.lei)?.lei ?? null,
      incorporationDate: fragments.find(f => f.incorporationDate)?.incorporationDate ?? null,
      registeredState: fragments.find(f => f.registeredState)?.registeredState ?? null,
      rocCity: fragments.find(f => f.rocCity)?.rocCity ?? null,
      listings: [],
      classification: null,
      corporateHierarchy: null,
      lastVerified: new Date().toISOString(),
      sourceIds: [],
    };

    for (const f of fragments) {
      if (f.legalName && !merged.legalName) merged.legalName = f.legalName;
      if (f.displayName && !merged.displayName) merged.displayName = f.displayName;
      if (f.cin && !merged.cin) merged.cin = f.cin;
      if (f.pan && !merged.pan) merged.pan = f.pan;
      if (f.gstin && !merged.gstin) merged.gstin = f.gstin;
      if (f.lei && !merged.lei) merged.lei = f.lei;
      if (f.incorporationDate && !merged.incorporationDate) merged.incorporationDate = f.incorporationDate;
      if (f.classification && !merged.classification) merged.classification = f.classification;
      if (f.corporateHierarchy && !merged.corporateHierarchy) merged.corporateHierarchy = f.corporateHierarchy;
      if (f.aliases) merged.aliases.push(...f.aliases.filter(a => !merged.aliases.includes(a)));
      if (f.listings) {
        for (const listing of f.listings) {
          if (!merged.listings.some(l => l.exchange === listing.exchange && l.symbol === listing.symbol)) {
            merged.listings.push(listing);
          }
        }
      }
      if (f.sourceIds) {
        for (const id of f.sourceIds) {
          if (!merged.sourceIds.includes(id)) merged.sourceIds.push(id);
        }
      }
    }

    return merged;
  }

  invalidateCache(): void {
    this.cache.clear();
  }
}

export const identityResolver = new IdentityResolver();
