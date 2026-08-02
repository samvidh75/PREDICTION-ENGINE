/**
 * Filing Classifier
 *
 * Classifies exchange filings into FilingCategory based on subject
 * text and filing type. Used to route filings to appropriate handlers
 * for further analysis.
 *
 * FilingCategory categories:
 *   financial_results | board_meeting | investor_presentation | annual_report
 *   shareholding_pattern | corporate_action | credit_rating | management_change
 *   acquisition_divestment | order_win | regulatory_litigation | resignation_auditor
 *   related_party | other
 */

import type { ExchangeFiling, FilingType } from './FilingTypes';

export type FilingCategory =
  | 'financial_results'
  | 'board_meeting'
  | 'investor_presentation'
  | 'annual_report'
  | 'shareholding_pattern'
  | 'corporate_action'
  | 'credit_rating'
  | 'management_change'
  | 'acquisition_divestment'
  | 'order_win'
  | 'regulatory_litigation'
  | 'resignation_auditor'
  | 'related_party'
  | 'other';

export class FilingClassifier {
  /**
   * Classify an exchange filing into a FilingCategory.
   * Uses both the filing type and the subject text for classification.
   */
  classify(filing: ExchangeFiling): FilingCategory {
    const type = filing.filingType;
    const subject = (filing.subject ?? '').toLowerCase();

    // First try filing type based classification
    const fromType = this.classifyByType(type);
    if (fromType !== 'other') return fromType;

    // Then try subject based classification
    const fromSubject = this.classifyBySubject(subject);
    return fromSubject;
  }

  /**
   * Classify based on the structured filing type.
   */
  private classifyByType(type: FilingType): FilingCategory {
    switch (type) {
      case 'quarterly_result':
        return 'financial_results';
      case 'annual_report':
        return 'annual_report';
      case 'shareholding_pattern':
        return 'shareholding_pattern';
      case 'credit_rating':
        return 'credit_rating';
      case 'board_meeting_notice':
        return 'board_meeting';
      case 'insider_trading':
        return 'management_change';
      case 'analyst_call_transcript':
        return 'investor_presentation';
      case 'pledge_disclosure':
        return 'shareholding_pattern';
      case 'press_release':
        return 'other'; // need subject analysis
      case 'agm_egm_notice':
        return 'board_meeting';
      case 'corp_announcement':
        return 'other'; // need subject analysis
      default:
        return 'other';
    }
  }

  /**
   * Classify based on subject text analysis.
   * Uses keyword matching with priority hierarchy.
   */
  private classifyBySubject(subject: string): FilingCategory {
    // Check for auditor resignation first (high priority)
    if (
      subject.includes('auditor') &&
      (subject.includes('resign') || subject.includes('resignation'))
    ) {
      return 'resignation_auditor';
    }

    // Check for management changes
    const managementTerms = ['director', 'cfo', 'chief financial officer', 'ceo', 'chief executive officer',
      'company secretary', 'manager', 'chairman', 'whole time director'];
    if (
      (subject.includes('resignation') || subject.includes('appoint') || subject.includes('cessation')) &&
      managementTerms.some(t => subject.includes(t))
    ) {
      return 'management_change';
    }

    // Regulatory / litigation
    if (
      subject.includes('litigation') || subject.includes('petition') ||
      subject.includes('investigation') || subject.includes('enforcement') ||
      subject.includes('regulatory') || subject.includes('sec') ||
      subject.includes('nclt') || subject.includes('court') ||
      subject.includes('tribunal') || subject.includes('notice')
    ) {
      const nonRegulatory = ['board meeting', 'agm', 'egm', 'book closure', 'record date'];
      if (!nonRegulatory.some(t => subject.includes(t))) {
        return 'regulatory_litigation';
      }
    }

    // Acquisition / divestment
    if (
      subject.includes('acquisition') || subject.includes('divestment') ||
      subject.includes('disposal') || subject.includes('sale of') ||
      subject.includes('acquire') || subject.includes('subsidiary') ||
      subject.includes('joint venture') || subject.includes('joint venture')
    ) {
      return 'acquisition_divestment';
    }

    // Order wins
    if (
      subject.includes('order') || subject.includes('contract') ||
      subject.includes('export order') || subject.includes('work order') ||
      subject.includes('letter of award') || subject.includes('loa')
    ) {
      if (
        !subject.includes('dividend') && !subject.includes('general meeting') &&
        !subject.includes('book closure')
      ) {
        return 'order_win';
      }
    }

    // Corporate actions
    if (
      subject.includes('dividend') || subject.includes('bonus') ||
      subject.includes('split') || subject.includes('rights') ||
      subject.includes('buyback') || subject.includes('delist') ||
      subject.includes('merge') || subject.includes('demerger')
    ) {
      return 'corporate_action';
    }

    // Related party transactions
    if (
      subject.includes('related party') || subject.includes('related party transaction')
    ) {
      return 'related_party';
    }

    // Credit rating
    if (
      subject.includes('rating') && (
        subject.includes('credit') || subject.includes('revised') ||
        subject.includes('upgrade') || subject.includes('downgrade') ||
        subject.includes('assign') || subject.includes('reaffirm') ||
        subject.includes('withdraw')
      )
    ) {
      return 'credit_rating';
    }

    // Financial results (missed by type)
    if (
      subject.includes('quarterly') || subject.includes('results') ||
      subject.includes('unaudited') || subject.includes('audited') ||
      subject.includes('financial') || subject.includes('profit') ||
      subject.includes('revenue')
    ) {
      return 'financial_results';
    }

    // Board meeting
    if (
      subject.includes('board meeting') || subject.includes('board of directors')
    ) {
      return 'board_meeting';
    }

    // Investor presentation / analyst meet
    if (
      subject.includes('presentation') || subject.includes('analyst') ||
      subject.includes('investor meet') || subject.includes('conference call')
    ) {
      return 'investor_presentation';
    }

    return 'other';
  }
}

export const filingClassifier = new FilingClassifier();