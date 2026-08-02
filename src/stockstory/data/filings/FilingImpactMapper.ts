/**
 * Filing Impact Mapper
 *
 * Maps exchange filings to an impact assessment.
 * Cautious by design — material claims require explicit evidence.
 * Does NOT generate fake buy/sell signals or market predictions.
 *
 * Impact levels:
 *   positive | negative | mixed | neutral | needs_review | unknown
 */

import type { ExchangeFiling } from './FilingTypes';
import type { FilingCategory } from './FilingClassifier';

export type FilingImpact = 'positive' | 'negative' | 'mixed' | 'neutral' | 'needs_review' | 'unknown';

export class FilingImpactMapper {
  /**
   * Map a filing to its most likely impact category.
   * Impact is determined by filing category + subject analysis.
   *
   * This method does NOT:
   * - Make Buy/Sell recommendations
   * - Claim market-moving potential
   * - Infer management intent
   *
   * Unknown / neutral is the default when evidence is insufficient.
   */
  mapImpact(
    filing: ExchangeFiling,
    category?: FilingCategory
  ): FilingImpact {
    const cat = category; // Use category if pre-classified

    // When no category provided, use neutral default with needs_review signal
    if (!cat) {
      return 'needs_review';
    }

    return this.impactByCategory(cat, filing.subject ?? '');
  }

  /**
   * Determine impact based on filing category and subject.
   */
  private impactByCategory(category: FilingCategory, subject: string): FilingImpact {
    const lower = subject.toLowerCase();

    switch (category) {
      case 'financial_results': {
        // Cannot determine direction without actual numbers
        return 'neutral';
      }

      case 'order_win': {
        // Order wins are context dependent — size, timeline matter
        if (lower.includes('export')) return 'positive';
        if (lower.includes('letter of intent') || lower.includes('memorandum of understanding')) return 'needs_review';
        return 'positive';
      }

      case 'management_change': {
        // Management changes can be positive or negative
        if (lower.includes('resignation') || lower.includes('cessation')) return 'needs_review';
        if (lower.includes('appoint') || lower.includes('reappoint')) return 'needs_review';
        return 'needs_review';
      }

      case 'resignation_auditor': {
        // Auditor resignation is always a red flag
        return 'negative';
      }

      case 'corporate_action': {
        // Corporate actions need context to assess
        if (lower.includes('buyback')) return 'positive';
        if (lower.includes('bonus') && !lower.includes('reverse')) return 'positive';
        if (lower.includes('split') && !lower.includes('reverse')) return 'positive';
        if (lower.includes('dividend')) return 'positive';
        return 'needs_review';
      }

      case 'credit_rating': {
        if (lower.includes('upgrade') || lower.includes('revised upward') || lower.includes('reaffirm')) return 'positive';
        if (lower.includes('downgrade') || lower.includes('revised downward') || lower.includes('negative watch')) return 'negative';
        return 'neutral';
      }

      case 'acquisition_divestment': {
        // Acquisitions and divestments are complex
        if (lower.includes('divestment') || lower.includes('disposal')) return 'needs_review';
        if (lower.includes('acquisition') || lower.includes('acquire')) return 'needs_review';
        return 'needs_review';
      }

      case 'regulatory_litigation': {
        // Litigation is generally negative but context-dependent
        if (
          lower.includes('settle') || lower.includes('settlement') ||
          lower.includes('disposed') || lower.includes('dismissed')
        ) {
          return 'neutral';
        }
        return 'negative';
      }

      case 'shareholding_pattern': {
        // Shareholding changes need context
        return 'needs_review';
      }

      case 'board_meeting':
      case 'investor_presentation':
      case 'annual_report':
      case 'related_party':
      default:
        return 'neutral';
    }
  }
}

export const filingImpactMapper = new FilingImpactMapper();