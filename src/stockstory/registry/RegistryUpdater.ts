/**
 * RegistryUpdater — Autonomous security master maintenance
 *
 * TRACK-20 Phase 1 — Task 3
 *
 * Responsibilities:
 * - Detect delistings (symbols removed from the PSE)
 * - Detect symbol changes (ticker renames)
 * - Detect mergers (symbol absorbed into another)
 * - Detect name changes (company name updates)
 * - Detect new listings (IPOs, new additions to exchange)
 *
 * IMPORTANT: the two exchange-fetch methods below (`fetchPrimaryMaster`,
 * `fetchSecondaryMaster`) previously called real Pakistan Stock Exchange
 * URLs (archives.pse.com.pk / www.pse.com.pk — .pk domains) under a "PSE"
 * name meant for the Philippine Stock Exchange, and the whole file was
 * structured around merging two separate exchange feeds the way India's
 * NSE+BSE dual-exchange system requires — the PSE is a single exchange,
 * so that split doesn't apply here. Both fetches are now no-ops pending a
 * real PSE data source (PHISIX for live quotes, PSE EDGE or the official
 * company list for a security master) — dead code is safer than code
 * that silently pulls the wrong country's securities list.
 *
 * Runs: Daily, as part of nightly population pipeline
 */

export interface MasterSecurityEntry {
  symbol: string;
  company_name: string;
  isin: string;
  pse_symbol: string | null;
  pse_symbol2: string | null;
  sector: string | null;
  industry: string | null;
  market_cap_category: 'Large Cap' | 'Mid Cap' | 'Small Cap' | 'Unknown';
  listing_status: 'Active' | 'Delisted' | 'Suspended' | 'Merged';
  data_sources: string[];
  last_verified: string; // ISO date
}

export interface RegistryChange {
  type: 'delisting' | 'symbol_change' | 'merger' | 'name_change' | 'new_listing';
  old_value: string | null;
  new_value: string | null;
  symbol: string;
  detected_at: string; // ISO date,
  action_required: 'auto_update' | 'manual_review';
}

export interface RegistryUpdateResult {
  changes: RegistryChange[];
  updated_count: number;
  removed_count: number;
  added_count: number;
  audit_log: string[];
}

/**
 * Primary PSE symbol master response shape (daily security list CSV).
 */
interface PrimaryMasterEntry {
  SYMBOL: string;
  ISIN: string;
  SERIES: string; // EQ, BE, etc.,
  FACE_VALUE: number;
  DATE_OF_LISTING: string;
}

/**
 * Secondary/supplementary PSE equity master response shape.
 */
interface SecondaryMasterEntry {
  scrip_code: string;
  scrip_id: string;
  isin: string;
  company_name: string;
  status: string;
  listing_date: string;
}

export class RegistryUpdater {
  private currentRegistry: Map<string, MasterSecurityEntry>;
  private changeLog: RegistryChange[] = [];
  private auditLog: string[] = [];

  constructor(existingEntries: MasterSecurityEntry[]) {
    this.currentRegistry = new Map();
    for (const entry of existingEntries) {
      this.currentRegistry.set(entry.symbol, entry);
    }
  }

  /**
   * Primary entry point. Fetches exchange masters, compares against
   * current registry, and produces a RegistryUpdateResult.
   */
  async runUpdate(): Promise<RegistryUpdateResult> {
    this.changeLog = [];
    this.auditLog = [];
    this.log('RegistryUpdater: starting daily update');

    const primarySymbols = await this.fetchPrimaryMaster();
    const secondarySymbols = await this.fetchSecondaryMaster();

    if (primarySymbols.length === 0 && secondarySymbols.length === 0) {
      this.log('WARNING: Both PSE master fetches returned empty. Skipping update.');
      return {
        changes: [],
        updated_count: 0,
        removed_count: 0,
        added_count: 0,
        audit_log: [...this.auditLog],
      };
    }

    const exchangeSymbols = this.mergeExchangeData(primarySymbols, secondarySymbols);

    // 1. Detect new listings
    const newListings = this.detectNewListings(exchangeSymbols);

    // 2. Detect delistings
    const delistings = this.detectDelistings(exchangeSymbols);

    // 3. Detect symbol changes (ticker renames)
    const symbolChanges = this.detectSymbolChanges(exchangeSymbols);

    // 4. Detect mergers (ISIN absorbed by another)
    const mergers = this.detectMergers(exchangeSymbols);

    // 5. Detect name changes
    const nameChanges = this.detectNameChanges(exchangeSymbols);

    // Apply auto-update changes
    const updatedCount = this.applyAutoUpdates(symbolChanges, nameChanges);
    const removedCount = this.applyRemovals(delistings, mergers);
    const addedCount = this.applyAdditions(newListings);

    this.log(`RegistryUpdater: complete. ${updatedCount} updated, ${removedCount} removed, ${addedCount} added`);
    this.log(`RegistryUpdater: ${this.changeLog.length} total changes detected`);

    return {
      changes: [...this.changeLog],
      updated_count: updatedCount,
      removed_count: removedCount,
      added_count: addedCount,
      audit_log: [...this.auditLog],
    };
  }

  /**
   * Fetch the primary PSE symbol master.
   *
   * Disabled: this previously called archives.pse.com.pk — a real Pakistan
   * Stock Exchange URL — under a name meant for the Philippine Stock
   * Exchange. No verified real PSE security-master CSV endpoint has been
   * wired in yet; returns empty rather than pulling the wrong country's
   * securities list.
   */
  private async fetchPrimaryMaster(): Promise<PrimaryMasterEntry[]> {
    this.log('Primary PSE master fetch not implemented — no verified PSE source wired in.');
    return [];
  }

  /**
   * Parse a PSE security-master CSV into PrimaryMasterEntry[].
   */
  private parsePseCsv(csv: string): PrimaryMasterEntry[] {
    const lines = csv.split('\n');
    if (lines.length < 2) return [];

    // Find header row
    const headerLine = lines[0].trim();
    const headers = headerLine.split(',').map(h => h.trim().toUpperCase());

    const symbolIdx = headers.indexOf('SYMBOL');
    const isinIdx = headers.indexOf('ISIN NUMBER');
    const seriesIdx = headers.indexOf('SERIES');
    const faceValueIdx = headers.indexOf('FACE VALUE');
    const listingDateIdx = headers.indexOf('DATE OF LISTING');

    if (symbolIdx < 0 || isinIdx < 0) {
      this.log('PSE CSV parse: required columns not found');
      return [];
    }

    const entries: PrimaryMasterEntry[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols = line.split(',').map(c => c.trim());
      const symbol = cols[symbolIdx]?.replace(/"/g, '');
      const isin = cols[isinIdx]?.replace(/"/g, '');

      if (!symbol || !isin || symbol === 'SYMBOL') continue;
      // Only equity series
      if (seriesIdx >= 0 && cols[seriesIdx] !== 'EQ') continue;

      entries.push({
        SYMBOL: symbol,
        ISIN: isin,
        SERIES: seriesIdx >= 0 ? cols[seriesIdx] : 'EQ',
        FACE_VALUE: faceValueIdx >= 0 ? parseFloat(cols[faceValueIdx]) || 0 : 0,
        DATE_OF_LISTING: listingDateIdx >= 0 ? cols[listingDateIdx]?.replace(/"/g, '') : '',
      });
    }

    return entries;
  }

  /**
   * Fetch a supplementary PSE equity master, if a second source is ever
   * wired in. Same "don't call the wrong country's real API" reasoning
   * as fetchPrimaryMaster — currently a no-op.
   */
  private async fetchSecondaryMaster(): Promise<SecondaryMasterEntry[]> {
    this.log('Secondary PSE master fetch not implemented — no verified PSE source wired in.');
    return [];
  }

  /**
   * Merge primary + secondary master data into a unified exchange symbol map.
   */
  private mergeExchangeData(
    primary: PrimaryMasterEntry[],
    secondary: SecondaryMasterEntry[],
  ): Map<string, { isin: string; pse_symbol: string | null; pse_symbol2: string | null }> {
    const merged = new Map<string, { isin: string; pse_symbol: string | null; pse_symbol2: string | null }>();

    for (const entry of primary) {
      merged.set(entry.SYMBOL, {
        isin: entry.ISIN,
        pse_symbol: entry.SYMBOL,
        pse_symbol2: null,
      });
    }

    for (const entry of secondary) {
      const existing = merged.get(entry.scrip_id);
      if (existing) {
        existing.pse_symbol2 = String(entry.scrip_code);
      } else {
        merged.set(entry.scrip_id, {
          isin: entry.isin,
          pse_symbol: null,
          pse_symbol2: String(entry.scrip_code),
        });
      }
    }

    return merged;
  }

  /**
   * Detect symbols in exchange data not in our registry → NEW LISTINGS.
   */
  private detectNewListings(
    exchangeSymbols: Map<string, { isin: string; pse_symbol: string | null; pse_symbol2: string | null }>,
  ): MasterSecurityEntry[] {
    const newEntries: MasterSecurityEntry[] = [];
    for (const [symbol, data] of exchangeSymbols) {
      if (!this.currentRegistry.has(symbol)) {
        this.log(`New listing detected: ${symbol} (ISIN: ${data.isin})`);
        this.changeLog.push({
          type: 'new_listing',
          old_value: null,
          new_value: symbol,
          symbol,
          detected_at: new Date().toISOString().split('T')[0],
          action_required: 'manual_review', // New listings need human review for sector/industry
        });

        newEntries.push({
          symbol,
          company_name: symbol, // Will need enrichment from metadata provider,
          isin: data.isin,
          pse_symbol: data.pse_symbol,
          pse_symbol2: data.pse_symbol2,
          sector: null,
          industry: null,
          market_cap_category: 'Unknown',
          listing_status: 'Active',
          data_sources: ['PSE Security Master'],
          last_verified: new Date().toISOString().split('T')[0],
        });
      }
    }
    return newEntries;
  }

  /**
   * Detect symbols in our registry not on exchange → DELISTINGS.
   */
  private detectDelistings(
    exchangeSymbols: Map<string, { isin: string; pse_symbol: string | null; pse_symbol2: string | null }>,
  ): Set<string> {
    const delistedSymbols = new Set<string>();
    for (const [symbol, entry] of this.currentRegistry) {
      if (entry.listing_status === 'Delisted' || entry.listing_status === 'Merged') continue;

      const onPrimary = entry.pse_symbol ? exchangeSymbols.has(entry.pse_symbol) : false;
      const onSecondary = entry.pse_symbol2 ? exchangeSymbols.has(entry.pse_symbol2) : false;

      if (!onPrimary && !onSecondary) {
        this.log(`Delisting detected: ${symbol} (primary: ${entry.pse_symbol}, secondary: ${entry.pse_symbol2})`);
        this.changeLog.push({
          type: 'delisting',
          old_value: symbol,
          new_value: null,
          symbol,
          detected_at: new Date().toISOString().split('T')[0],
          action_required: 'auto_update',
        });
        delistedSymbols.add(symbol);
      }
    }
    return delistedSymbols;
  }

  /**
   * Detect symbol (ticker) changes using ISIN as the stable identifier.
   * If ISIN X was mapped to SYMBOL_A in registry but SYMBOL_B on exchange,
   * the ticker changed.
   */
  private detectSymbolChanges(
    exchangeSymbols: Map<string, { isin: string; pse_symbol: string | null; pse_symbol2: string | null }>,
  ): Map<string, string> {
    // Build ISIN → exchange symbol map
    const isinToExchangeSymbol = new Map<string, string>();
    for (const [symbol, data] of exchangeSymbols) {
      isinToExchangeSymbol.set(data.isin, symbol);
    }

    const symbolChanges = new Map<string, string>();
    for (const [registrySymbol, entry] of this.currentRegistry) {
      const exchangeSymbol = isinToExchangeSymbol.get(entry.isin);
      if (exchangeSymbol && exchangeSymbol !== registrySymbol && exchangeSymbol !== entry.pse_symbol) {
        this.log(`Symbol change: ${registrySymbol} → ${exchangeSymbol} (ISIN: ${entry.isin})`);
        this.changeLog.push({
          type: 'symbol_change',
          old_value: registrySymbol,
          new_value: exchangeSymbol,
          symbol: registrySymbol,
          detected_at: new Date().toISOString().split('T')[0],
          action_required: 'auto_update',
        });
        symbolChanges.set(registrySymbol, exchangeSymbol);
      }
    }
    return symbolChanges;
  }

  /**
   * Detect mergers: ISIN that was in registry is no longer in exchange data.
   * Cross-reference with delistings to distinguish merger from simple delisting.
   */
  private detectMergers(
    exchangeSymbols: Map<string, { isin: string; pse_symbol: string | null; pse_symbol2: string | null }>,
  ): Set<string> {
    const activeIsins = new Set<string>();
    for (const [, data] of exchangeSymbols) {
      activeIsins.add(data.isin);
    }

    const mergedSymbols = new Set<string>();
    for (const [symbol, entry] of this.currentRegistry) {
      if (entry.listing_status === 'Delisted' || entry.listing_status === 'Merged') continue;
      if (!activeIsins.has(entry.isin)) {
        this.log(`Possible merger detected: ${symbol} (ISIN ${entry.isin} no longer active)`);
        this.changeLog.push({
          type: 'merger',
          old_value: symbol,
          new_value: null,
          symbol,
          detected_at: new Date().toISOString().split('T')[0],
          action_required: 'manual_review',
        });
        mergedSymbols.add(symbol);
      }
    }
    return mergedSymbols;
  }

  /**
   * Detect company name changes using metadata provider enrichment.
   * This requires supplementary metadata fetch (Yahoo Finance or a PSE data source).
   * For now, placeholder with extensibility point.
   */
  private detectNameChanges(
    _exchangeSymbols: Map<string, { isin: string; pse_symbol: string | null; pse_symbol2: string | null }>,
  ): Map<string, string> {
    // Name changes require metadata provider enrichment.
    // This method exists as an extensibility point for future implementation.
    // The ProviderCoordinator.getMetadata() can provide company_name which
    // can be diffed against the registry.
    this.log('Name change detection: metadata enrichment not implemented (requires ProviderCoordinator)');
    return new Map<string, string>();
  }

  /**
   * Apply auto-update changes (symbol changes, name changes).
   */
  private applyAutoUpdates(
    symbolChanges: Map<string, string>,
    nameChanges: Map<string, string>,
  ): number {
    let count = 0;

    for (const [oldSymbol, newSymbol] of symbolChanges) {
      const entry = this.currentRegistry.get(oldSymbol);
      if (entry) {
        // Copy entry to new symbol key
        const updatedEntry: MasterSecurityEntry = {
          ...entry,
          symbol: newSymbol,
          pse_symbol: newSymbol,
          last_verified: new Date().toISOString().split('T')[0],
          data_sources: [...entry.data_sources, 'RegistryUpdater — symbol change'],
        };
        this.currentRegistry.delete(oldSymbol);
        this.currentRegistry.set(newSymbol, updatedEntry);
        count++;
      }
    }

    for (const [symbol, newName] of nameChanges) {
      const entry = this.currentRegistry.get(symbol);
      if (entry && entry.company_name !== newName) {
        entry.company_name = newName;
        entry.last_verified = new Date().toISOString().split('T')[0];
        count++;
      }
    }

    return count;
  }

  /**
   * Mark delisted/merged symbols in registry.
   */
  private applyRemovals(delistings: Set<string>, mergers: Set<string>): number {
    let count = 0;

    for (const symbol of delistings) {
      const entry = this.currentRegistry.get(symbol);
      if (entry) {
        entry.listing_status = 'Delisted';
        entry.last_verified = new Date().toISOString().split('T')[0];
        count++;
      }
    }

    for (const symbol of mergers) {
      const entry = this.currentRegistry.get(symbol);
      if (entry) {
        entry.listing_status = 'Merged';
        entry.last_verified = new Date().toISOString().split('T')[0];
        count++;
      }
    }

    return count;
  }

  /**
   * Add new listings to registry.
   */
  private applyAdditions(newListings: MasterSecurityEntry[]): number {
    for (const entry of newListings) {
      this.currentRegistry.set(entry.symbol, entry);
    }
    return newListings.length;
  }

  /**
   * Get current state of registry after update.
   */
  getRegistry(): MasterSecurityEntry[] {
    return Array.from(this.currentRegistry.values());
  }

  /**
   * Get active (non-delisted, non-merged) symbols.
   */
  getActiveSymbols(): string[] {
    return Array.from(this.currentRegistry.entries())
      .filter(([, entry]) => entry.listing_status === 'Active')
      .map(([symbol]) => symbol);
  }

  private log(message: string): void {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${message}`;
    this.auditLog.push(logLine);
    console.info(logLine);
  }
}
