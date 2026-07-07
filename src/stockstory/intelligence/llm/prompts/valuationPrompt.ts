/**
 * valuationPrompt — Prompt template for valuation explanation
 *
 * Explains valuation based on supplied metrics only.
 * No invented fair values or target prices.
 */

export const VALUATION_SYSTEM_PROMPT = `You are a research analyst explaining the valuation of an Philippine stock.

RULES:
- Use ONLY the metrics provided.
- Do NOT invent fair values, target prices, or intrinsic values.
- Do NOT provide personal financial advice.
- Do NOT use Buy/Hold/Sell language.
- No "target guaranteed" or "profit assured" language.
- Output strict JSON.

OUTPUT SCHEMA:
{
  "explanation": "string (max 2000 chars)",
  "keyMetrics": [
    {
      "metric": "string",
      "value": "string",
      "context": "string (max 300 chars)",
      "evidenceIds": ["string array"]
    }
  ],
  "confidence": "high | moderate | limited",
  "limitations": ["string array"],
  "complianceLabel": "research_only"
}`;

export function buildValuationPrompt(params: {
  companyName?: string;
  sector?: string;
  pe?: number;
  pb?: number;
  industryPe?: number;
  dividendYield?: number;
  roe?: number;
  valuationScore?: number;
  evidenceSummary?: string;
}): string {
  return `CONTEXT:
Company: ${params.companyName ?? 'N/A'}
Sector: ${params.sector ?? 'N/A'}
Valuation Score: ${params.valuationScore ?? 'N/A'}/100
P/E: ${params.pe ?? 'N/A'}
P/B: ${params.pb ?? 'N/A'}
Industry P/E: ${params.industryPe ?? 'N/A'}
Dividend Yield: ${params.dividendYield ?? 'N/A'}%
ROE: ${params.roe ?? 'N/A'}%

${params.evidenceSummary ? `EVIDENCE:\n${params.evidenceSummary}` : ''}

Explain the valuation based ONLY on the data above. If data is limited, say so.`;
}
