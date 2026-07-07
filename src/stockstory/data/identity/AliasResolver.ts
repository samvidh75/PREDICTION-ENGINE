/**
 * Alias Resolver
 *
 * Handles Philippine company name aliases:
 * - Full names → abbreviations (HDFC Bank → HDFCBANK)
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

  /** Load known Philippine market aliases */
  loadKnownAliases(): void {
    // Full name → symbol
    this.addAlias('TCS', 'TATA CONSULTANCY SERVICES');
    this.addAlias('TCS', 'TATA CONSULTANCY');
    this.addAlias('INFY', 'INFOSYS');
    this.addAlias('INFY', 'INFOSYS TECHNOLOGIES');
    this.addAlias('RELIANCE', 'RIL');
    this.addAlias('RELIANCE', 'RELIANCE INDUSTRIES');
    this.addAlias('HDFCBANK', 'HDFC BANK');
    this.addAlias('HDFCBANK', 'HDFC BANK LTD');
    this.addAlias('ICICIBANK', 'ICICI BANK');
    this.addAlias('ICICIBANK', 'ICICI BANK LTD');
    this.addAlias('SBIN', 'SBI');
    this.addAlias('SBIN', 'STATE BANK OF INDIA');
    this.addAlias('ITC', 'I T C');
    this.addAlias('ITC', 'ITC LIMITED');
    this.addAlias('LT', 'L&T');
    this.addAlias('LT', 'LARSEN AND TOUBRO');
    this.addAlias('LT', 'LARSEN & TOUBRO');
    this.addAlias('BHARTIARTL', 'BHARTI AIRTEL');
    this.addAlias('BHARTIARTL', 'AIRTEL');
    this.addAlias('WIPRO', 'WIPRO LTD');
    this.addAlias('HCLTECH', 'HCL TECHNOLOGIES');
    this.addAlias('SUNPHARMA', 'SUN PHARMA');
    this.addAlias('SUNPHARMA', 'SUN PHARMACEUTICAL');
    this.addAlias('MARUTI', 'MARUTI SUZUKI');
    this.addAlias('MARUTI', 'MSIL');
    this.addAlias('AXISBANK', 'AXIS BANK');
    this.addAlias('KOTAKBANK', 'KOTAK MAHINDRA BANK');
    this.addAlias('KOTAKBANK', 'KOTAK BANK');
    this.addAlias('TATAMOTORS', 'TATA MOTORS');
    this.addAlias('BAJFINANCE', 'BAJAJ FINANCE');
    this.addAlias('TITAN', 'TITAN COMPANY');
    this.addAlias('ASIANPAINT', 'ASIAN PAINTS');
    this.addAlias('NESTLEIND', 'NESTLE INDIA');
    this.addAlias('NESTLEIND', 'NESTLE');
    this.addAlias('ULTRACEMCO', 'ULTRATECH CEMENT');
    this.addAlias('HINDUNILVR', 'HUL');
    this.addAlias('HINDUNILVR', 'HINDUSTAN UNILEVER');
    this.addAlias('ADANIENT', 'ADANI ENTERPRISES');
    this.addAlias('ADANIPORTS', 'ADANI PORTS');
    this.addAlias('ADANIPORTS', 'ADANI PORTS AND SEZ');
    this.addAlias('JSWSTEEL', 'JSW STEEL');
    this.addAlias('TATASTEEL', 'TATA STEEL');
    this.addAlias('POWERGRID', 'POWER GRID');
    this.addAlias('POWERGRID', 'POWERGRID CORPORATION');
    this.addAlias('NTPC', 'NTPC LIMITED');
    this.addAlias('ONGC', 'OIL AND NATURAL GAS CORPORATION');
    this.addAlias('COALINDIA', 'COAL INDIA');
    this.addAlias('BPCL', 'BHARAT PETROLEUM');
    this.addAlias('HINDZINC', 'HINDUSTAN ZINC');
    this.addAlias('VEDL', 'VEDANTA');
    this.addAlias('DMART', 'AVENUE SUPERMARTS');
    this.addAlias('DMART', 'DMART');
    this.addAlias('IRCTC', 'INDIAN RAILWAY CATERING AND TOURISM CORP');
    this.addAlias('ZOMATO', 'ZOMATO LIMITED');
    this.addAlias('PAYTM', 'ONE97 COMMUNICATIONS');
    this.addAlias('NYVAA', 'FSN E COMMERCE VENTURES');
    this.addAlias('POLICYBZR', 'PB FINTECH');
    this.addAlias('LICI', 'LIFE INSURANCE CORPORATION OF INDIA');
    this.addAlias('LICI', 'LIC');
  }
}

export const aliasResolver = new AliasResolver();
aliasResolver.loadKnownAliases();
