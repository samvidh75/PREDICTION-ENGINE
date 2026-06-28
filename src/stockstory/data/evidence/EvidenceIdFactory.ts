/**
 * Evidence ID Factory
 *
 * Generates deterministic, human-readable evidence IDs.
 * Format: ev_{DOMAIN}_{SYMBOL}_{ATTRIBUTE}_{PERIOD}_{NONCE}
 */

import type { EvidenceId } from './EvidenceLineageTypes';
import crypto from 'node:crypto';

export class EvidenceIdFactory {
  private counter = 0;

  create(
    domain: string,
    symbol: string,
    attribute: string,
    period?: string
  ): EvidenceId {
    const parts = ['ev', domain.toUpperCase(), symbol.toUpperCase(), attribute.toUpperCase()];
    if (period) parts.push(period.toUpperCase());
    parts.push(String(++this.counter).padStart(3, '0'));

    const id = parts.join('_');
    const label = `${symbol} ${attribute}${period ? ` (${period})` : ''}`;

    return { id, label, kind: this.inferKind(attribute), domain };
  }

  private inferKind(attribute: string): EvidenceId['kind'] {
    const upper = attribute.toUpperCase();
    if (upper.includes('DIVIDEND') || upper.includes('BONUS') || upper.includes('SPLIT') || upper.includes('MERGER')) {
      return 'corporate_action';
    }
    if (upper.includes('FILING') || upper.includes('XBRL')) return 'filing';
    if (upper.includes('REVENUE') || upper.includes('PROFIT') || upper.includes('EPS') || upper.includes('QUARTERLY')) {
      return 'result';
    }
    if (upper.includes('NEWS') || upper.includes('SENTIMENT')) return 'news';
    if (upper.includes('PRICE') || upper.includes('VOLUME') || upper.includes('OPEN') || upper.includes('CLOSE')) {
      return 'market';
    }
    return 'derived';
  }

  /** Generate a short hash for tamper detection */
  hash(records: { evidenceId: EvidenceId; capturedAt: string }[]): string {
    const input = records.map(r => `${r.evidenceId.id}:${r.capturedAt}`).join('|');
    return crypto.createHash('sha256').update(input).digest('hex').slice(0, 12);
  }
}

export const evidenceIdFactory = new EvidenceIdFactory();
