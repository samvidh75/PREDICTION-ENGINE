/**
 * Research Question Types
 */

export type ResearchQuestionType =
  | 'company_overview'
  | 'thesis_question'
  | 'risk_question'
  | 'valuation_question'
  | 'earnings_question'
  | 'peer_question'
  | 'sector_question'
  | 'filing_question'
  | 'scenario_question'
  | 'methodology_question'
  | 'unsupported_or_advice_request';

export interface ResearchQuestion {
  question: string;
  symbol?: string;
  sector?: string;
  userId?: string;
}

export interface ResearchAnswer {
  questionType: ResearchQuestionType;
  answer: string;
  researchBasis: string;
  limitations: string[];
  confidence: string;
  redirected: boolean;
  disclaimer: string;
}
