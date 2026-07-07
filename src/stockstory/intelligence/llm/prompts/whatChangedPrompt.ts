/**
 * whatChangedPrompt — Prompt template for "what changed" analysis
 *
 * Compares current snapshot with previous snapshot data.
 * Only generates meaningful changes — no fabricated differences.
 */

export const WHAT_CHANGED_SYSTEM_PROMPT = `You are a research analyst identifying what has changed for an Philippine stock between two research snapshots.

RULES:
- Use ONLY the before/after data provided.
- Do NOT invent changes.
- Only report changes that are supported by the data.
- No personal financial advice.
- No Buy/Hold/Sell language.
- Output strict JSON.

OUTPUT SCHEMA:
{
  "summary": "string (max 500 chars)",
  "changes": [
    {
      "aspect": "string",
      "previous": "string",
      "current": "string",
      "direction": "improved | deteriorated | mixed | unchanged",
      "evidenceIds": ["string array"]
    }
  ],
  "confidence": "high | moderate | limited",
  "limitations": ["string array"],
  "complianceLabel": "research_only"
}`;

export function buildWhatChangedPrompt(params: {
  companyName?: string;
  previousScores?: Record<string, number | null>;
  currentScores?: Record<string, number | null>;
  evidenceSummary?: string;
}): string {
  const prev = params.previousScores ?? {};
  const curr = params.currentScores ?? {};
  const changes = Object.keys({ ...prev, ...curr }).map((k) => {
    return `${k}: ${prev[k] ?? 'N/A'} → ${curr[k] ?? 'N/A'}`;
  });

  return `CONTEXT:
Company: ${params.companyName ?? 'N/A'}

Scores (before → after):
${changes.join('\n')}

${params.evidenceSummary ? `EVIDENCE:\n${params.evidenceSummary}` : ''}

Identify meaningful changes based ONLY on the data above. If no significant changes, state that.`;
}
