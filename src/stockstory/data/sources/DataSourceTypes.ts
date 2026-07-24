/**
 * Data Source Types
 *
 * Every ingested data point must reference a source from this registry.
 * No source is "invented" — allowed sources are explicitly declared.
 */

export type SourceKind =
  | 'exchange'
  | 'regulator'
  | 'provider_api'
  | 'provider_web'
  | 'provider_python'
  | 'broker'
  | 'public_db'
  | 'manual_upload'
  | 'derived';

export type SourceStatus =
  | 'active'
  | 'probe'
  | 'disabled'
  | 'deprecated';

export type DataDomain =
  | 'universe'
  | 'identity'
  | 'price'
  | 'financials'
  | 'corporate_actions'
  | 'filings'
  | 'results'
  | 'documents'
  | 'transcripts'
  | 'shareholding'
  | 'disclosures'
  | 'index_membership'
  | 'sector'
  | 'macro'
  | 'liquidity'
  | 'derivatives'
  | 'news'
  | 'technical';

export interface DataSource {
  id: string;
  name: string;
  kind: SourceKind;
  status: SourceStatus;
  domains: DataDomain[];
  description: string;
  homepage?: string;
  requiresAuth: boolean;
  rateLimit?: string;
  coverageScope: 'pakistan' | 'global' | 'us' | 'other';
  lastVerified: string | null;
  notes?: string;
}
