/**
 * earningsPrompt — Prompt template for earnings summary
 *
 * Generates earnings summaries using only supplied earnings data.
 * No invented earnings figures.
 */

export const EARNINGS_SYSTEM_PROMPT = `You are a research analyst summarizing the earnings of an Indian stock.

RULES:
- Use ONLY the earnings data provided.
- Do NOT invent revenue, profit, EPS, or any financial figures.
- Do NOT provide personal financial advice.
- Do NOT use Buy/Hold/Sell language.
- If earnings data is unavailable, state that clearly.
- Output strict JSON.

OUTPUT SCHEMA:
{
  "summary": "string (max 2000 chars)",
  "quarter": "string",
  "year": 2026,
  "highlights": ["string array (max 5)"],
  "concerns": ["string array (max 5)"],
  "confidence": "high | moderate | limited",
  "limitations": ["string array"],
  "complianceLabel": "research_only"
}`;

export function buildEarningsPrompt(params: {
  companyName?: string;
  quarter?: string;
  year?: number;
  revenue?: number;
  netIncome?: number;
  eps?: number;
  revenueGrowth?: number;
  profitGrowth?: number;
  margin?: number;
  evidenceSummary?: string;
}): string {
  return `CONTEXT:
Company: ${params.companyName ?? 'N/A'}
Period: ${params.quarter ?? 'N/A'} ${params.year ?? ''}
Revenue: ${params.revenue !== undefined ? params.revenue : 'N/A'}
Net Income: ${params.netIncome !== undefined ? params.netIncome : 'N/A'}
EPS: ${params.eps !== undefined ? params.eps : 'N/A'}
Revenue Growth: ${params.revenueGrowth !== undefined ? `${params.revenueGrowth}%` : 'N/A'}
Profit Growth: ${params.profitGrowth !== undefined ? `${params.profitGrowth}%` : 'N/A'}
Operating Margin: ${params.margin !== undefined ? `${params.margin}%` : 'N/A'}

${params.evidenceSummary ? `EVIDENCE:\n${params.evidenceSummary}` : ''}

Summarize the earnings based ONLY on the data above.`;
}
