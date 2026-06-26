export const FORBIDDEN_TERMS: RegExp[] = [
  /\bguaranteed returns?\b/i,
  /\bsure shot\b/i,
  /\bmultibagger\b/i,
  /\bbuy now\b/i,
  /\bsell immediately\b/i,
  /\bstrong buy\b/i,
  /\bstrong sell\b/i,
  /\bprice target\b/i,
  /\btarget price\b/i,
  /\btarget guaranteed\b/i,
  /\bfake broker\b/i,
  /\bfake order\b/i,
  /\bfake portfolio\b/i,
  /\bfake p&l\b/i,
  /\bfake profit\b/i,
  /\bfake holding\b/i,
  /\bprovider status\b/i,
  /\bprovider health\b/i,
  /\bapi name\b/i,
  /\bapi endpoint\b/i,
  /\bprovider name\b/i,
  /\bcoverage diagnostics\b/i,
  /\bfreshness unavailable\b/i,
  /\bdata source\b/i,
  /\bsource label\b/i,
  /\bsource lineage\b/i,
  /\braw quote\b/i,
  /\braw history\b/i,
  /\braw fundamental\b/i,
  /\binternal verification\b/i,
  /\bsymbol gap\b/i,
  /\bdatabase wording\b/i,
  /\bmigration in progress\b/i,
  /\bbackfill in progress\b/i,
  /\bsymbol not found\b/i,
  /\bdirect personal advice\b/i,
  /\binvestment advice\b/i,
  /\bfinancial advice\b/i,
  /\binvented source\b/i,
  /\binvented data freshness\b/i,
  /\bbroker credentials\b/i,
  /\blogin with broker\b/i,
  /\bconnect your broker\b/i,
];

export const ALLOWED_EXCEPTIONS: RegExp[] = [
  /allowed.*forbidden|forbidden.*allowed/i,
  /\btest/i,
  /\btesting/i,
  /\bfixture/i,
  /\bmock/i,
  /\bunit test\b/i,
  /\be2e test\b/i,
  /\bintegration test\b/i,
  /\bspec\b/,
  /\b__tests__\b/,
  /\btests\//,
  /\bfixtures\//,
  /\bai-evals\//,
  /\breports\/ai\//,
  /\bPolicyGuardrails\.test\b/,
  /\bforbiddenCopy\.test\b/,
  /\bproductLanguageCopyFilter\b/,
  /\bcomplianceCopyFilter\b/,
];

export interface PolicyCheckResult {
  blocked: boolean;
  matchedTerm?: string;
  matchedPattern?: string;
  overriddenByException?: string;
}

export class PolicyGuardrails {
  check(text: string, context?: string): PolicyCheckResult {
    for (const exception of ALLOWED_EXCEPTIONS) {
      if (context && exception.test(context)) {
        return { blocked: false };
      }
    }

    for (const pattern of FORBIDDEN_TERMS) {
      const match = text.match(pattern);
      if (match) {
        return {
          blocked: true,
          matchedTerm: match[0],
          matchedPattern: pattern.toString(),
        };
      }
    }

    return { blocked: false };
  }

  sanitize(text: string, context?: string): string {
    const check = this.check(text, context);
    if (!check.blocked) return text;

    let sanitized = text;
    for (const pattern of FORBIDDEN_TERMS) {
      sanitized = sanitized.replace(pattern, '[filtered]');
    }
    return sanitized;
  }

  validateOutput(output: Record<string, string>, context?: string): { valid: boolean; violations: Array<{ field: string; term: string }> } {
    const violations: Array<{ field: string; term: string }> = [];

    for (const [field, value] of Object.entries(output)) {
      const check = this.check(value, context);
      if (check.blocked && check.matchedTerm) {
        violations.push({ field, term: check.matchedTerm });
      }
    }

    return {
      valid: violations.length === 0,
      violations,
    };
  }
}

export const policyGuardrails = new PolicyGuardrails();
