/**
 * ResearchQuestionClassifier
 */

import type { ResearchQuestionType } from './ResearchQuestionTypes';

const ADVICE_PATTERNS = [
  /should i buy/i,
  /should i sell/i,
  /should i invest/i,
  /is it a good (stock|investment)/i,
  /buy or sell/i,
  /worth buying/i,
];

export class ResearchQuestionClassifier {
  classify(question: string): ResearchQuestionType {
    const q = question.trim();

    if (ADVICE_PATTERNS.some((p) => p.test(q))) {
      return 'unsupported_or_advice_request';
    }

    if (/risky|risk radar|why.*risk/i.test(q)) return 'risk_question';
    if (/valuation|stretched|expensive|cheap|pe\b|pb\b/i.test(q)) return 'valuation_question';
    if (/earnings|result|quarter|revenue|profit/i.test(q)) return 'earnings_question';
    if (/compare|vs\.?|versus|peer/i.test(q)) return 'peer_question';
    if (/sector|industry/i.test(q)) return 'sector_question';
    if (/filing|announcement|disclosure/i.test(q)) return 'filing_question';
    if (/thesis|conviction|bull|bear/i.test(q)) return 'thesis_question';
    if (/scenario|what if|sensitivity/i.test(q)) return 'scenario_question';
    if (/methodology|how do you|research basis/i.test(q)) return 'methodology_question';
    if (/what changed|latest|update/i.test(q)) return 'company_overview';
    if (/watch|next/i.test(q)) return 'company_overview';

    return 'company_overview';
  }
}

export const researchQuestionClassifier = new ResearchQuestionClassifier();
