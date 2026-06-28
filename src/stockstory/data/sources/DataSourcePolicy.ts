/**
 * Data Source Policy
 *
 * Rules governing which sources are allowed, how data is attributed,
 * and what can and cannot be displayed to users.
 * No provider/API/internal names exposed in public output.
 */

import type { DataSource, SourceKind, SourceStatus } from './DataSourceTypes';

export interface SourcePolicyRule {
  kind: SourceKind;
  allowedInProduct: boolean;
  allowedInternal: boolean;
  requiresAttribution: boolean;
  attributionLabel?: string;
  notes: string;
}

export class DataSourcePolicy {
  private rules: SourcePolicyRule[] = [
    {
      kind: 'exchange',
      allowedInProduct: true,
      allowedInternal: true,
      requiresAttribution: true,
      attributionLabel: 'Exchange Data',
      notes: 'Exchange data is public. Attribute to exchange, not StockStory.',
    },
    {
      kind: 'regulator',
      allowedInProduct: true,
      allowedInternal: true,
      requiresAttribution: true,
      attributionLabel: 'Regulatory Filing',
      notes: 'Regulatory data is public. Attribute to regulator.',
    },
    {
      kind: 'provider_api',
      allowedInProduct: false,
      allowedInternal: true,
      requiresAttribution: false,
      notes: 'Provider API data — internal only. Use generic attribution in product.',
    },
    {
      kind: 'provider_web',
      allowedInProduct: false,
      allowedInternal: true,
      requiresAttribution: false,
      notes: 'Provider web data — internal only. Verify terms before use in product.',
    },
    {
      kind: 'provider_python',
      allowedInProduct: false,
      allowedInternal: true,
      requiresAttribution: false,
      notes: 'Python library data — internal only. Check library license.',
    },
    {
      kind: 'broker',
      allowedInProduct: false,
      allowedInternal: true,
      requiresAttribution: false,
      notes: 'Broker data — internal only. Requires user-authorized access.',
    },
    {
      kind: 'public_db',
      allowedInProduct: true,
      allowedInternal: true,
      requiresAttribution: false,
      notes: 'Public database data — verify license terms.',
    },
    {
      kind: 'manual_upload',
      allowedInProduct: true,
      allowedInternal: true,
      requiresAttribution: true,
      attributionLabel: 'User-Provided',
      notes: 'User-uploaded data — verify ownership/license before display.',
    },
    {
      kind: 'derived',
      allowedInProduct: true,
      allowedInternal: true,
      requiresAttribution: false,
      notes: 'Derived/computed data — internal computation. No source attribution needed.',
    },
  ];

  getRule(kind: SourceKind): SourcePolicyRule | undefined {
    return this.rules.find((r) => r.kind === kind);
  }

  isAllowedInProduct(source: DataSource): boolean {
    if (source.status === 'disabled' || source.status === 'deprecated') return false;
    return this.getRule(source.kind)?.allowedInProduct ?? false;
  }

  isAllowedInternal(source: DataSource): boolean {
    if (source.status === 'deprecated') return false;
    return this.getRule(source.kind)?.allowedInternal ?? false;
  }

  getAttributionLabel(source: DataSource): string | undefined {
    return this.getRule(source.kind)?.attributionLabel;
  }

  /** Get public-safe source label — never exposes provider names */
  getPublicSourceLabel(source: DataSource): string {
    if (this.getRule(source.kind)?.attributionLabel) {
      return this.getRule(source.kind)!.attributionLabel!;
    }
    switch (source.kind) {
      case 'exchange': return 'Exchange Data';
      case 'regulator': return 'Regulatory Filing';
      case 'provider_api':
      case 'provider_web':
      case 'provider_python': return 'Market Data Provider';
      case 'broker': return 'Broker Data';
      case 'public_db': return 'Public Database';
      case 'manual_upload': return 'User-Provided';
      case 'derived': return 'StockStory Analysis';
      default: return 'Data Provider';
    }
  }

  /** Filter a list of sources to only those allowed in product */
  filterProductAllowed(sources: DataSource[]): DataSource[] {
    return sources.filter((s) => this.isAllowedInProduct(s));
  }

  /** Filter a list of sources to only those allowed for internal use */
  filterInternalAllowed(sources: DataSource[]): DataSource[] {
    return sources.filter((s) => this.isAllowedInternal(s));
  }
}

export const dataSourcePolicy = new DataSourcePolicy();
