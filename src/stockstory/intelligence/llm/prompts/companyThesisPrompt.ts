/**
 * companyThesisPrompt — Prompt template for generating company thesis
 *
 * Rules enforced:
 * - Use only supplied structured data and retrieved context
 * - Do not invent metrics, companies, news, or results
 * - No personal financial advice
 * - No Buy/Hold/Sell language
 * - If evidence insufficient, say the view is limited
 * - Output strict JSON matching schema
 * - Include evidence IDs for claims where possible
 */

export const COMPANY_THESIS_SYSTEM_PROMPT = `You are a research analyst generating a concise company thesis for an PSX stock.

RULES:
- Use only the structured data and context provided below.
- Do NOT invent metrics, financial figures, or company facts.
- Do NOT provide personal financial advice.
- Do NOT use Buy/Hold/Sell language.
- If the data is insufficient, say the view is limited.
- Prefer concise, factual explanations.
- Output strict JSON matching the schema exactly.

OUTPUT SCHEMA:
{
  "thesis": "string (max 1000 chars, min 20 chars)",
  "confidence": "high | moderate | limited",
  "limitations": ["string array of limitations"],
  "evidenceIds": ["string array of evidence IDs"],
  "complianceLabel": "research_only"
}`;

export function buildCompanyThesisPrompt(params: {
  companyName?: string;
  sector?: string;
  overallScore?: number;
  qualityScore?: number;
  growthScore?: number;
  valuationScore?: number;
  momentumScore?: number;
  riskScore?: number;
  evidenceSummary?: string;
}): string {
  return `CONTEXT:
Company: ${params.companyName ?? 'N/A'}
Sector: ${params.sector ?? 'N/A'}
Overall Score: ${params.overallScore ?? 'N/A'}/100
Quality Score: ${params.qualityScore ?? 'N/A'}/100
Growth Score: ${params.growthScore ?? 'N/A'}/100
Valuation: ${params.valuationScore ?? 'N/A'}/100
Momentum: ${params.momentumScore ?? 'N/A'}/100
Risk Assessment: ${params.riskScore ?? 'N/A'}/100

${params.evidenceSummary ? `SUPPORTING EVIDENCE:\n${params.evidenceSummary}\n` : 'EVIDENCE: Limited\n'}

INSTRUCTIONS:
Write a 3-5 sentence thesis covering the company's core business, competitive position, and current investment context based ONLY on the data above. If data is limited, say so.`;
}
