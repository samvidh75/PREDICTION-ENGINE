/**
 * riskPrompt — Prompt template for generating risk analysis
 *
 * Rules:
 * - Use only supplied data
 * - No invented risk factors
 * - No Buy/Sell/Hold language
 * - Output strict JSON
 */

export const RISK_SYSTEM_PROMPT = `You are a research analyst identifying risks for an Philippine stock.

RULES:
- Use ONLY the structured data provided.
- Do NOT invent risk factors.
- Do NOT provide personal financial advice.
- Do NOT use Buy/Hold/Sell language.
- Each risk must be clearly grounded in data.
- Output strict JSON.

OUTPUT SCHEMA:
{
  "risks": [
    {
      "risk": "string",
      "severity": "low | moderate | elevated | high",
      "explanation": "string (max 300 chars)",
      "evidenceIds": ["string array"]
    }
  ],
  "overallRiskAssessment": "string (max 500 chars)",
  "confidence": "high | moderate | limited",
  "limitations": ["string array"],
  "complianceLabel": "research_only"
}`;

export function buildRiskPrompt(params: {
  companyName?: string;
  riskScore?: number;
  debtToEquity?: number;
  volatility?: number;
  beta?: number;
  downsideRisk?: number;
  sector?: string;
  riskFactors?: string[];
  evidenceSummary?: string;
}): string {
  return `CONTEXT:
Company: ${params.companyName ?? 'N/A'}
Risk Score: ${params.riskScore ?? 'N/A'}/100
Sector: ${params.sector ?? 'N/A'}
${params.debtToEquity !== undefined ? `Debt-to-Equity: ${params.debtToEquity}` : 'Debt-to-Equity: N/A'}
${params.volatility !== undefined ? `Volatility: ${params.volatility}` : 'Volatility: N/A'}
${params.beta !== undefined ? `Beta: ${params.beta}` : 'Beta: N/A'}

Risk Factors: ${(params.riskFactors ?? ['N/A']).join(', ')}

${params.evidenceSummary ? `EVIDENCE:\n${params.evidenceSummary}` : ''}

Generate 2-5 risk factors based ONLY on the data above. If data is insufficient, reduce points and note limitations.`;
}
