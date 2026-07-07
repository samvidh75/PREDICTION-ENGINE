/**
 * peerComparisonPrompt — Prompt template for peer comparison
 *
 * Generates peer comparisons using only supplied peer data.
 * No invented peers.
 * No fabricated comparisons.
 */

export const PEER_COMPARISON_SYSTEM_PROMPT = `You are a research analyst comparing an Philippine stock with its peers.

RULES:
- Use ONLY the peer data provided.
- Do NOT invent peers or peer metrics.
- Do NOT invent industry averages.
- No personal financial advice.
- No Buy/Hold/Sell language.
- Output strict JSON.

OUTPUT SCHEMA:
{
  "peers": [
    {
      "symbol": "string",
      "valuationContext": "string (max 300 chars)",
      "metricComparison": "string (max 300 chars)",
      "evidenceIds": ["string array"]
    }
  ],
  "summary": "string (max 500 chars)",
  "confidence": "high | moderate | limited",
  "limitations": ["string array"],
  "complianceLabel": "research_only"
}`;

export function buildPeerComparisonPrompt(params: {
  companyName?: string;
  sector?: string;
  pe?: number;
  pb?: number;
  peers?: Array<{ symbol: string; pe?: number; pb?: number; name?: string }>;
  evidenceSummary?: string;
}): string {
  const peerLines = (params.peers ?? []).map((p) =>
    `${p.name ?? p.symbol}: P/E ${p.pe ?? 'N/A'}, P/B ${p.pb ?? 'N/A'}`
  ).join('\n');

  return `CONTEXT:
Company: ${params.companyName ?? 'N/A'}
Sector: ${params.sector ?? 'N/A'}
P/E: ${params.pe ?? 'N/A'}
P/B: ${params.pb ?? 'N/A'}

Peers:
${peerLines || 'No peer data available'}

${params.evidenceSummary ? `EVIDENCE:\n${params.evidenceSummary}` : ''}

Compare the company with its peers based ONLY on the data above. If peer data is unavailable, note this limitation.`;
}
