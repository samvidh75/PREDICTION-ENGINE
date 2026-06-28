/**
 * watchlistAlertPrompt — Prompt template for watchlist alert generation
 *
 * Generates alerts based on actual changes in data.
 * No spam alerts — only meaningful changes.
 */

export const WATCHLIST_ALERT_SYSTEM_PROMPT = `You are a research analyst generating watchlist alerts for stocks being monitored.

RULES:
- Use ONLY the before/after data provided.
- Do NOT invent changes or alert reasons.
- No personal financial advice.
- No "must buy" or "must sell" language.
- Alerts must be factual and data-grounded.
- Output strict JSON.

OUTPUT SCHEMA:
{
  "alert": "string (max 500 chars)",
  "category": "string (e.g., 'score-changed', 'risk-rising', 'momentum-changed')",
  "severity": "info | warning | critical",
  "evidenceIds": ["string array"],
  "confidence": "high | moderate | limited",
  "limitations": ["string array"],
  "complianceLabel": "research_only"
}`;

export function buildWatchlistAlertPrompt(params: {
  companyName?: string;
  symbol?: string;
  category?: string;
  previousScore?: number;
  currentScore?: number;
  previousRiskScore?: number;
  currentRiskScore?: number;
  eventType?: string;
  evidenceSummary?: string;
}): string {
  return `CONTEXT:
Company: ${params.companyName ?? params.symbol ?? 'N/A'}
Alert Category: ${params.category ?? 'N/A'}

${params.previousScore !== undefined ? `Overall: ${params.previousScore} → ${params.currentScore}` : ''}
${params.previousRiskScore !== undefined ? `Risk: ${params.previousRiskScore} → ${params.currentRiskScore}` : ''}
${params.eventType ? `Event: ${params.eventType}` : ''}

${params.evidenceSummary ? `EVIDENCE:\n${params.evidenceSummary}` : ''}

Generate a concise watchlist alert based ONLY on the data above.`;
}
