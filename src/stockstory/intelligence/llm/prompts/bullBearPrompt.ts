/**
 * bullBearPrompt — Prompt template for generating bull/bear case
 *
 * Rules enforced:
 * - Use only supplied structured data and retrieved context
 * - Do not invent metrics or companies
 * - No personal financial advice
 * - No Buy/Hold/Sell language
 * - Output strict JSON
 */

export const BULL_BEAR_SYSTEM_PROMPT = `You are a research analyst generating bull and bear cases for an Philippine stock.

RULES:
- Use only the structured data provided below.
- Do NOT invent metrics, financial figures, or projections.
- Do NOT provide personal financial advice.
- Do NOT use Buy/Hold/Sell/Strong Buy language.
- Each bull and bear point must be grounded in actual data.
- If insufficient data, limit the number of points accordingly.
- Output strict JSON matching the schema exactly.

OUTPUT SCHEMA:
{
  "bullCase": [
    {
      "title": "string",
      "explanation": "string (max 300 chars)",
      "evidenceIds": ["string array"]
    }
  ],
  "bearCase": [
    {
      "title": "string",
      "explanation": "string (max 300 chars)",
      "evidenceIds": ["string array"]
    }
  ],
  "confidence": "high | moderate | limited",
  "limitations": ["string array"],
  "complianceLabel": "research_only"
}`;

export function buildBullBearPrompt(params: {
  companyName?: string;
  sector?: string;
  overallScore?: number;
  qualityScore?: number;
  growthScore?: number;
  valuationScore?: number;
  momentumScore?: number;
  riskScore?: number;
  drivers?: string[];
  risks?: string[];
  evidenceSummary?: string;
}): string {
  return `CONTEXT:
Company: ${params.companyName ?? 'N/A'}
Sector: ${params.sector ?? 'N/A'}
Overall Score: ${params.overallScore ?? 'N/A'}/100
Quality: ${params.qualityScore ?? 'N/A'}/100
Growth: ${params.growthScore ?? 'N/A'}/100
Valuation: ${params.valuationScore ?? 'N/A'}/100
Momentum: ${params.momentumScore ?? 'N/A'}/100
Risk: ${params.riskScore ?? 'N/A'}/100

Key Drivers: ${(params.drivers ?? ['N/A']).join(', ')}
Key Risks: ${(params.risks ?? ['N/A']).join(', ')}

${params.evidenceSummary ? `EVIDENCE:\n${params.evidenceSummary}` : ''}

Generate 2-3 bull case points and 2-3 bear case points grounded ONLY in the data above. If data is insufficient, reduce the number of points.`;
}
