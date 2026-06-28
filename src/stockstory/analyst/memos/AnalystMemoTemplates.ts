/**
 * AnalystMemoTemplates
 */

import type { AnalystMemoType } from './AnalystMemoTypes';

export function memoTitle(type: AnalystMemoType, subject: string): string {
  const labels: Record<AnalystMemoType, string> = {
    company_research_memo: `Company Research Memo: ${subject}`,
    earnings_memo: `Results Note: ${subject}`,
    filing_memo: `Filing Summary: ${subject}`,
    sector_memo: `Sector Brief: ${subject}`,
    watchlist_review_memo: `Watchlist Review: ${subject}`,
    risk_review_memo: `Risk Review: ${subject}`,
    scenario_memo: `Scenario Memo: ${subject}`,
  };
  return labels[type];
}
