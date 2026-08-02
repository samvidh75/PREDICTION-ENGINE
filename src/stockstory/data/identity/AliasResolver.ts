/**
 * Alias Resolver
 *
 * Handles PSE company name aliases:
 * - Full names → abbreviations (BDO Unibank → BDO)
 * - Old names → new names (after mergers/acquisitions)
 * - Common misspellings and variants
 * - PSE vs PSE symbol differences
 */

export class AliasResolver {
  /** canonical → set of aliases */
  private aliasMap: Map<string, Set<string>> = new Map();

  /** alias → canonical */
  private reverseMap: Map<string, string> = new Map();

  addAlias(canonical: string, alias: string): void {
    const upperCanonical = canonical.toUpperCase();
    const upperAlias = alias.toUpperCase();

    if (upperCanonical === upperAlias) return;

    const aliases = this.aliasMap.get(upperCanonical) ?? new Set();
    aliases.add(upperAlias);
    this.aliasMap.set(upperCanonical, aliases);
    this.reverseMap.set(upperAlias, upperCanonical);
  }

  resolve(name: string): string {
    const upper = name.toUpperCase();
    return this.reverseMap.get(upper) ?? upper;
  }

  getAllAliases(canonical: string): string[] {
    const upper = canonical.toUpperCase();
    return Array.from(this.aliasMap.get(upper) ?? []);
  }

  /** Load known PSE market aliases */
  loadKnownAliases(): void {
    // Full name → symbol
    this.addAlias('BDO', 'BDO UNIBANK');
    this.addAlias('BDO', 'BDO UNIBANK INC');
    this.addAlias('TEL', 'PLDT');
    this.addAlias('TEL', 'PLDT INC');
    this.addAlias('TEL', 'PHILIPPINE LONG DISTANCE');
    this.addAlias('BPI', 'BANK OF THE PHILIPPINE ISLANDS');
    this.addAlias('BPI', 'BPI BANK');
    this.addAlias('JFC', 'JOLLIBEE');
    this.addAlias('JFC', 'JOLLIBEE FOODS');
    this.addAlias('JFC', 'JOLLIBEE FOODS CORP');
    this.addAlias('MER', 'MERALCO');
    this.addAlias('MER', 'MANILA ELECTRIC');
    this.addAlias('SM', 'SM INVESTMENTS');
    this.addAlias('SM', 'SM INVESTMENTS CORP');
    this.addAlias('ALI', 'AYALA LAND');
    this.addAlias('ALI', 'AYALA LAND INC');
    this.addAlias('AP', 'AYALA CORP');
    this.addAlias('AP', 'AYALA CORPORATION');
    this.addAlias('GLO', 'GLOBE TELECOM');
    this.addAlias('GLO', 'GLOBE TELECOM INC');
    this.addAlias('GLO', 'GLOBE TELECOM');
    this.addAlias('GLO', 'GLOBE');
    this.addAlias('JFC', 'JOLLIBEE FOODS CORP');
    this.addAlias('SMPH', 'SM PRIME HOLDINGS');
    this.addAlias('RLC', 'ROBINSONS LAND');
    this.addAlias('BDO', 'BDO UNIBANK');
    this.addAlias('BDO', 'BDO UNIBANK INC');
    this.addAlias('TEL', 'PLDT');
    this.addAlias('TEL', 'PLDT INC');
    this.addAlias('GLO', 'GLOBE TELECOM');
    this.addAlias('JFC', 'JOLLIBEE');
    this.addAlias('JFC', 'JOLLIBEE FOODS');
    this.addAlias('AC', 'AYALA CORPORATION');
    this.addAlias('AC', 'AYALA CORP');
    this.addAlias('ALI', 'AYALA LAND');
    this.addAlias('SM', 'SM INVESTMENTS');
    this.addAlias('SMPH', 'SM PRIME');
    this.addAlias('SMPH', 'SM PRIME HOLDINGS');
    this.addAlias('MER', 'MERALCO');
    this.addAlias('MER', 'MANILA ELECTRIC');
    this.addAlias('ICT', 'ICTSI');
    this.addAlias('ICT', 'INTERNATIONAL CONTAINER TERMINAL');
    this.addAlias('MONDE', 'MONDE NISSIN');
    this.addAlias('URC', 'UNIVERSAL ROBINA');
    this.addAlias('BPI', 'BANK OF THE PHILIPPINE ISLANDS');
    this.addAlias('MBT', 'METROPOLITAN BANK');
    this.addAlias('MBT', 'METROBANK');
    this.addAlias('PGOLD', 'PUREGOLD');
    this.addAlias('PGOLD', 'PUREGOLD PRICE CLUB');
    this.addAlias('AREIT', 'AREIT INC');
  }
}

export const aliasResolver = new AliasResolver();
aliasResolver.loadKnownAliases();
