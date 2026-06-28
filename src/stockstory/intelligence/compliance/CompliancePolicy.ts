/**
 * CompliancePolicy
 *
 * Defines the compliance rules for StockStory research output.
 * StockStory output is research-only — never personalized advice.
 * No guarantees, no direct Buy/Sell/Hold (unless compliance flag enabled).
 * No target prices unless sourced and compliant.
 * No suitability claims.
 * Invest CTA must be broker handoff / review flow only.
 */

export interface ComplianceRule {
  id: string;
  description: string;
  enabled: boolean;
  check: (text: string) => ComplianceViolation | null;
}

export interface ComplianceViolation {
  ruleId: string;
  ruleDescription: string;
  violation: string;
  severity: 'error' | 'warning';
}

export const COMPLIANCE_STATES: ReadonlyArray<string> = [
  'High conviction',
  'Watch',
  'Risk rising',
  'Thesis improving',
  'Needs review',
  'Avoid for now',
  'Insufficient information',
] as const;

export class CompliancePolicy {
  private rules: ComplianceRule[] = [];

  constructor() {
    this.initDefaultRules();
  }

  private initDefaultRules(): void {
    this.rules = [
      {
        id: 'no-buy-sell',
        description: 'No direct Buy/Sell/Hold recommendations',
        enabled: true,
        check: (text: string) => {
          const patterns = [
            /\bbuy\s+now\b/i,
            /\bstrong\s+buy\b/i,
            /\bsell\s+immediately\b/i,
            /\bmust\s+buy\b/i,
            /\bmust\s+sell\b/i,
            /\bmust\s+hold\b/i,
          ];
          for (const p of patterns) {
            const m = text.match(p);
            if (m) {
              return {
                ruleId: 'no-buy-sell',
                ruleDescription: 'No direct Buy/Sell/Hold recommendations',
                violation: `Found prohibited phrase: "${m[0]}"`,
                severity: 'error',
              };
            }
          }
          return null;
        },
      },
      {
        id: 'no-guarantees',
        description: 'No guaranteed return language',
        enabled: true,
        check: (text: string) => {
          const patterns = [
            /\bguaranteed\s+return\b/i,
            /\bsure\s+shot\b/i,
            /\bmultibagger\b/i,
            /\btarget\s+guaranteed\b/i,
            /\bprofit\s+assured\b/i,
            /\brisk-free\b/i,
            /\bguaranteed\s+profit\b/i,
            /\bcannot\s+lose\b/i,
          ];
          for (const p of patterns) {
            const m = text.match(p);
            if (m) {
              return {
                ruleId: 'no-guarantees',
                ruleDescription: 'No guaranteed return language',
                violation: `Found prohibited phrase: "${m[0]}"`,
                severity: 'error',
              };
            }
          }
          return null;
        },
      },
      {
        id: 'research-only-label',
        description: 'Output is marked as research-only',
        enabled: true,
        check: (text: string) => {
          if (!text.includes('research-only') && !text.includes('Research basis')) {
            return {
              ruleId: 'research-only-label',
              ruleDescription: 'Output should include research-only context',
              violation: 'No research-only label found in output',
              severity: 'warning',
            };
          }
          return null;
        },
      },
      {
        id: 'no-personal-advice',
        description: 'No personalized investment advice',
        enabled: true,
        check: (text: string) => {
          const patterns = [
            /you\s+should\s+(buy|sell|invest|purchase)/i,
            /your\s+portfolio\s+should/i,
            /i\s+recommend\s+you/i,
            /you\s+need\s+to\s+(buy|sell|invest)/i,
          ];
          for (const p of patterns) {
            const m = text.match(p);
            if (m) {
              return {
                ruleId: 'no-personal-advice',
                ruleDescription: 'No personalized investment advice',
                violation: `Found personalized advice: "${m[0]}"`,
                severity: 'error',
              };
            }
          }
          return null;
        },
      },
      {
        id: 'no-suitability',
        description: 'No suitability claims',
        enabled: true,
        check: (text: string) => {
          const patterns = [
            /\bsuitable\s+for\b/i,
            /\bperfect\s+for\s+(conservative|aggressive|retirement)/i,
            /\bideal\s+for\b/i,
          ];
          for (const p of patterns) {
            const m = text.match(p);
            if (m) {
              return {
                ruleId: 'no-suitability',
                ruleDescription: 'No suitability claims',
                violation: `Found suitability claim: "${m[0]}"`,
                severity: 'warning',
              };
            }
          }
          return null;
        },
      },
    ];
  }

  checkText(text: string): ComplianceViolation[] {
    return this.rules
      .filter((r) => r.enabled)
      .map((r) => r.check(text))
      .filter((v): v is ComplianceViolation => v !== null);
  }

  isComplianceState(state: string): boolean {
    return COMPLIANCE_STATES.includes(state as any);
  }

  get validStates(): ReadonlyArray<string> {
    return COMPLIANCE_STATES;
  }
}
