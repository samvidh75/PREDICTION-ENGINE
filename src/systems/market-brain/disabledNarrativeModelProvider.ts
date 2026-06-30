// src/systems/market-brain/disabledNarrativeModelProvider.ts
// Phase 15 — Default disabled provider. Always returns ok: false.
//
// This is the only provider wired by default. Users who want local LLM
// enrichment must opt in via env vars (see ollamaNarrativeModelProvider.ts).

import type { NarrativeModelInput, NarrativeModelProvider, NarrativeModelResult } from './narrativeModelProvider';

export class DisabledNarrativeModelProvider implements NarrativeModelProvider {
  readonly name = 'disabled';

  isEnabled(): boolean {
    return false;
  }

  async explain(_input: NarrativeModelInput): Promise<NarrativeModelResult> {
    return { ok: false, reason: 'disabled' };
  }
}
