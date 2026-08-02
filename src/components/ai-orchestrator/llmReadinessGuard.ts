/**
 * llmReadinessGuard.ts — LLM context readiness guard.
 *
 * Ensures the LLM never invents or fabricates missing data values when
 * the research context has partial/empty data. The guard validates that
 * the context provided to the LLM is safe, that is: it will not cause
 * the LLM to hallucinate prices, scores, or other numeric values.
 *
 * The guard does NOT prevent the LLM from explaining evidence — it only
 * prevents the LLM from receiving context that would cause fabrication.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface ContextField {
  /** Field name (for logging) */
  name: string;
  /** Whether this field is populated with real data */
  populated: boolean;
  /** Whether the LLM may reasonably infer this from context */
  safeToInfer?: boolean;
}

export interface ReadinessVerdict {
  /** Overall: true if context is safe for LLM consumption */
  ok: boolean;
  /** Individual field verdicts */
  fields: FieldVerdict[];
  /** Short human-readable reason when !ok */
  reason?: string;
}

export interface FieldVerdict {
  name: string;
  ok: boolean;
  issue?: string;
}

export type GuardSeverity = 'block' | 'warn' | 'pass';

export interface GuardConfig {
  /** Severity when critical fields (price, score) are missing */
  criticalFieldMissing: GuardSeverity;
  /** Severity when evidence is empty */
  emptyEvidence: GuardSeverity;
  /** Severity when dates/figures would force inference */
  staleData: GuardSeverity;
}

const DEFAULT_CONFIG: GuardConfig = {
  criticalFieldMissing: 'block',
  emptyEvidence: 'warn',
  staleData: 'warn',
};

/* ------------------------------------------------------------------ */
/*  Guard implementation                                              */
/* ------------------------------------------------------------------ */

/**
 * Evaluate whether a research context is safe to send to the LLM.
 *
 * Returns a verdict that categorizes issues:
 *  - block: LLM MUST NOT receive this context (would hallucinate)
 *  - warn: LLM may produce weak output but won't fabricate
 *  - pass: safe
 */
export function evaluateContextReadiness(
  fields: ContextField[],
  config: GuardConfig = DEFAULT_CONFIG,
): ReadinessVerdict {
  const fieldVerdicts: FieldVerdict[] = [];
  let blocked = false;

  for (const field of fields) {
    if (field.populated) {
      fieldVerdicts.push({ name: field.name, ok: true });
      continue;
    }

    // Determine if this is a critical field
    const isCritical = !field.safeToInfer;

    if (isCritical) {
      if (config.criticalFieldMissing === 'block') {
        fieldVerdicts.push({
          name: field.name,
          ok: false,
          issue: 'Critical field missing — LLM would hallucinate',
        });
        blocked = true;
      } else if (config.criticalFieldMissing === 'warn') {
        fieldVerdicts.push({
          name: field.name,
          ok: false,
          issue: 'Critical field missing (warning only)',
        });
      } else {
        fieldVerdicts.push({ name: field.name, ok: true });
      }
    } else {
      // Non-critical: warn only
      if (config.emptyEvidence === 'block') {
        fieldVerdicts.push({
          name: field.name,
          ok: false,
          issue: 'Evidence missing — LLM may fabricate explanation',
        });
        blocked = true;
      } else if (config.emptyEvidence === 'warn') {
        fieldVerdicts.push({
          name: field.name,
          ok: false,
          issue: 'Evidence empty — explanation may be generic',
        });
      } else {
        fieldVerdicts.push({ name: field.name, ok: true });
      }
    }
  }

  const reasons = fieldVerdicts
    .filter((v) => !v.ok && v.issue)
    .map((v) => `${v.name}: ${v.issue}`);

  return {
    ok: !blocked,
    fields: fieldVerdicts,
    reason: blocked ? `LLM context blocked: ${reasons.join('; ')}` : undefined,
  };
}

/**
 * Sanitize context before passing to LLM.
 *
 * When readiness is not OK, this strips or nullifies the fields that would
 * cause hallucination so the LLM receives either safe data or an empty
 * context that triggers a graceful "data unavailable" response pathway.
 */
export function sanitizeContext<T extends Record<string, unknown>>(
  context: T,
  fields: ContextField[],
): { safe: T; warnings: string[] } {
  const verdict = evaluateContextReadiness(fields);
  const warnings: string[] = [];

  if (verdict.ok) {
    return { safe: context, warnings: [] };
  }

  const safe = { ...context };

  for (const fv of verdict.fields) {
    if (fv.ok) continue;
    warnings.push(fv.issue ?? `Field "${fv.name}" is unsafe`);
    // Nullify the unsafe field so the LLM doesn't see partial/unreliable data
    (safe as Record<string, unknown>)[fv.name] = null;
  }

  return { safe, warnings };
}

/**
 * Strip all numeric fields from context if critical data is missing.
 * Used as a last resort when the LLM prompt template is too flexible.
 */
export function stripNumericFields<T extends Record<string, unknown>>(
  context: T,
  criticalFields: string[],
): T {
  const stripped = { ...context };
  for (const key of criticalFields) {
    if (key in stripped && typeof stripped[key] === 'number') {
      delete stripped[key];
    }
  }
  return stripped;
}
