/**
 * Index Membership Service
 *
 * Tracks which stocks belong to which indices over time.
 * All memberships must be explicitly added — no invented membership.
 * Time-aware: tracks validFrom/validTo for historical accuracy.
 */

import type { IndexName, IndexConstituent, IndexMembership, IndexChangeEvent } from './IndexTypes';

function stableHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash) + input.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

export class IndexMembershipService {
  private memberships: Map<string, IndexMembership> = new Map();
  private constituents: Map<string, IndexConstituent> = new Map();
  private changeEvents: IndexChangeEvent[] = [];

  /** Add a stock to an index membership */
  add(membership: Omit<IndexMembership, 'id' | 'createdAt'>): IndexMembership {
    const key = `${membership.symbol}:${membership.indexName}:${membership.validFrom}`;
    if (this.memberships.has(key)) {
      return this.memberships.get(key)!;
    }

    const id = `idxmem_${stableHash(key)}`;
    const newMembership: IndexMembership = {
      ...membership,
      id,
      createdAt: new Date().toISOString(),
    };

    this.memberships.set(key, newMembership);

    // Update constituent cache if currently valid
    if (newMembership.validTo === null) {
      this.constituents.set(newMembership.symbol, {
        symbol: newMembership.symbol,
        companyName: '',
        isin: null,
        sector: null,
        industry: null,
        weight: null,
        addedAt: newMembership.validFrom,
      });
    }

    return newMembership;
  }

  /** Update constituent metadata (company name, weight, etc.) */
  updateConstituent(symbol: string, data: Partial<IndexConstituent>): void {
    const existing = this.constituents.get(symbol);
    if (existing) {
      this.constituents.set(symbol, { ...existing, ...data });
    } else {
      this.constituents.set(symbol, {
        symbol,
        companyName: data.companyName ?? '',
        isin: data.isin ?? null,
        sector: data.sector ?? null,
        industry: data.industry ?? null,
        weight: data.weight ?? null,
        addedAt: data.addedAt ?? null,
      });
    }
  }

  /** Get all memberships for a symbol */
  getBySymbol(symbol: string): IndexMembership[] {
    const result: IndexMembership[] = [];
    for (const membership of this.memberships.values()) {
      if (membership.symbol === symbol) {
        result.push(membership);
      }
    }
    return result.sort((a, b) => b.validFrom.localeCompare(a.validFrom));
  }

  /** Get constituents of a specific index */
  getConstituents(indexName: IndexName, asOf?: string): IndexConstituent[] {
    const result: IndexConstituent[] = [];
    const asOfDate = asOf ?? new Date().toISOString().slice(0, 10);

    for (const membership of this.memberships.values()) {
      if (membership.indexName !== indexName) continue;
      if (membership.validFrom > asOfDate) continue;
      if (membership.validTo !== null && membership.validTo < asOfDate) continue;

      const constituent = this.constituents.get(membership.symbol);
      if (constituent) {
        result.push({ ...constituent });
      } else {
        result.push({
          symbol: membership.symbol,
          companyName: '',
          isin: null,
          sector: null,
          industry: null,
          weight: null,
          addedAt: membership.validFrom,
        });
      }
    }

    return result;
  }

  /** Get latest index membership for a symbol */
  getLatestForSymbol(symbol: string): IndexMembership | null {
    const memberships = this.getBySymbol(symbol);
    // Prefer current memberships (validTo === null), then most recent
    const current = memberships.find(m => m.validTo === null);
    if (current) return current;
    return memberships[0] ?? null;
  }

  /** Record an index change event */
  recordChange(event: Omit<IndexChangeEvent, 'id' | 'detectedAt'>): IndexChangeEvent {
    const key = `${event.indexName}:${event.symbol}:${event.changeType}:${event.effectiveDate}`;
    const id = `idxchg_${stableHash(key)}`;
    const newEvent: IndexChangeEvent = {
      ...event,
      id,
      detectedAt: new Date().toISOString(),
    };
    this.changeEvents.push(newEvent);
    return newEvent;
  }

  /** Get all change events, optionally filtered */
  getChanges(filter?: {
    indexName?: IndexName;
    symbol?: string;
    fromDate?: string;
    toDate?: string;
    changeType?: 'added' | 'removed' | 'rebalanced';
  }): IndexChangeEvent[] {
    let events = [...this.changeEvents];

    if (filter?.indexName) {
      events = events.filter(e => e.indexName === filter.indexName);
    }
    if (filter?.symbol) {
      events = events.filter(e => e.symbol === filter.symbol);
    }
    if (filter?.changeType) {
      events = events.filter(e => e.changeType === filter.changeType);
    }
    if (filter?.fromDate) {
      events = events.filter(e => e.effectiveDate >= filter.fromDate!);
    }
    if (filter?.toDate) {
      events = events.filter(e => e.effectiveDate <= filter.toDate!);
    }

    return events.sort((a, b) => b.detectedAt.localeCompare(a.detectedAt));
  }

  /** Get statistics about index membership */
  getStats(): {
    totalMemberships: number;
    totalConstituents: number;
    activeMemberships: number;
    changeEventCount: number;
    indices: Record<IndexName, number>;
  } {
    const indices: Record<string, number> = {};
    let activeMemberships = 0;

    for (const membership of this.memberships.values()) {
      const idx = membership.indexName;
      indices[idx] = (indices[idx] ?? 0) + 1;
      if (membership.validTo === null) {
        activeMemberships++;
      }
    }

    return {
      totalMemberships: this.memberships.size,
      totalConstituents: this.constituents.size,
      activeMemberships,
      changeEventCount: this.changeEvents.length,
      indices: indices as Record<IndexName, number>,
    };
  }
}

export const indexMembershipService = new IndexMembershipService();