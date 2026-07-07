/**
 * factorExplanationPrompt — Prompt template for factor score explanation
 *
 * Explains each factor score in plain English.
 * No invented drivers.
 * No advice.
 */

export const FACTOR_EXPLANATION_SYSTEM_PROMPT = `You are a research analyst explaining individual factor scores for an Philippine stock.

RULES:
- Use ONLY the factor data provided.
- Do NOT invent drivers or explanations.
- No personal financial advice.
- No Buy/Hold/Sell language.
- Output strict JSON.

OUTPUT SCHEMA:
{
  "factor": "string",
  "score": 0,
  "explanation": "string (max 500 chars)",
  "keyDrivers": ["string array (max 5)"],
  "evidenceIds": ["string array"],
  "confidence": "high | moderate | limited",
  "limitations": ["string array"],
  "complianceLabel": "research_only"
}`;

export function buildFactorExplanationPrompt(params: {
  factorName: string;
  score: number;
  drivers?: string[];
  metrics?: Record<string, number | string | null>;
  evidenceSummary?: string;
}): string {
  const metricLines = Object.entries(params.metrics ?? {})
    .map(([k, v]) => `${k}: ${v ?? 'N/A'}`)
    .join('\n');

  return `CONTEXT:
Factor: ${params.factorName}
Score: ${params.score}/100
Key Drivers: ${(params.drivers ?? ['N/A']).join(', ')}

Metrics:
${metricLines || 'No detailed metrics available'}

${params.evidenceSummary ? `EVIDENCE:\n${params.evidenceSummary}` : ''}

Explain the factor score in plain English based ONLY on the data above.`;
}
