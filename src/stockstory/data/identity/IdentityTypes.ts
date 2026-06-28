/**
 * Company Identity Types
 *
 * Canonical representation of a company and its identifiers
 * across all Indian market exchanges, registrars, and regulatory bodies.
 */

export interface CompanyIdentity {
  /** Internal canonical ID */
  companyId: string;

  /** Legal name as per MCA/ROC records */
  legalName: string;

  /** Display name used in UI */
  displayName: string;

  /** Common trading names and aliases */
  aliases: string[];

  /** Corporate Identification Number (21-digit) */
  cin: string | null;

  /** Permanent Account Number */
  pan: string | null;

  /** GST registration number */
  gstin: string | null;

  /** Legal Entity Identifier */
  lei: string | null;

  /** Date of incorporation (ISO date) */
  incorporationDate: string | null;

  /** Registered office address state */
  registeredState: string | null;

  /** Registrar of Companies city */
  rocCity: string | null;

  /** Listing status across exchanges */
  listings: ExchangeListing[];

  /** Industry classification */
  classification: IndustryClassification | null;

  /** Parent/subsidiary relationships */
  corporateHierarchy: CorporateHierarchy | null;

  /** Last verification timestamp */
  lastVerified: string | null;

  /** Sources that contributed to this identity */
  sourceIds: string[];
}

export interface ExchangeListing {
  exchange: 'NSE' | 'BSE';
  symbol: string;
  series: string;
  isin: string | null;
  listingDate: string | null;
  status: 'active' | 'suspended' | 'delisted';
}

export interface IndustryClassification {
  /** BSE Industry Group */
  bseIndustry: string | null;

  /** NSE Industry */
  nseIndustry: string | null;

  /** NIC 2008 code (5-digit) */
  nicCode: string | null;

  /** MSME classification */
  msmeCategory: 'micro' | 'small' | 'medium' | 'large' | null;

  /** Custom internal sector mapping */
  internalSector: string | null;

  /** Internal industry within sector */
  internalIndustry: string | null;
}

export interface CorporateHierarchy {
  parentCompanyId: string | null;
  subsidiaryIds: string[];
  isHoldingCompany: boolean;
  groupName: string | null;
}

export interface StockToCompanyMapping {
  symbol: string;
  companyId: string;
  isPrimary: boolean;
  exchange: 'NSE' | 'BSE';
  validFrom: string | null;
  validTo: string | null;
}
