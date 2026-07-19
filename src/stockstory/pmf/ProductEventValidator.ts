/**
 * ProductEventValidator — Validates analytics event payloads against PMF schema rules.
 *
 * Checks:
 *  - Required fields present and typed
 *  - Category/action in known set
 *  - Timestamp is valid ISO
 *  - No PII in metadata
 *  - No forbidden values in fields
 */

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
}

const KNOWN_CATEGORIES = new Set([
  'discovery',
  'engagement',
  'trust',
  'retention',
  'research',
]);

const KNOWN_ACTIONS = new Set([
  'search_performed',
  'search_success',
  'search_failed',
  'search_selected',
  'stock_viewed',
  'compare_performed',
  'superpage_view',
  'superpage_scroll_50',
  'superpage_scroll_100',
  'superpage_tab_switch',
  'watchlist_add',
  'watchlist_remove',
  'trust_centre_visit',
  'prediction_journal_visit',
  'limitations_click',
  'session_start',
  'session_end',
  'daily_active',
  'returning_user',
  'view',
]);

const PII_PATTERNS = [
  /email/i,
  /phone/i,
  /mobile/i,
  /aadhaar/i,
  /pan/i,
  /password/i,
  /token/i,
  /secret/i,
  /credit.?card/i,
  /bank.?account/i,
  /ifsc/i,
  /address/i,
  /pincode/i,
  /ip.?address/i,
];

const FORBIDDEN_VALUES = [
  /guaranteed return/i,
  /sure shot/i,
  /multibagger/i,
  /Buy now/i,
  /Strong Buy/i,
  /Sell immediately/i,
  /target guaranteed/i,
  /profit assured/i,
  /risk-free/i,
  /must buy/i,
  /must sell/i,
  /add more/i,
  /exit now/i,
];

const ISO_TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

export class ProductEventValidator {
  validate(event: Record<string, unknown>): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Required fields
    if (!event.category || typeof event.category !== 'string') {
      errors.push({ field: 'category', message: 'Missing or non-string category' });
    } else if (!KNOWN_CATEGORIES.has(event.category)) {
      errors.push({ field: 'category', message: `Unknown category: ${event.category}` });
    }

    if (!event.action || typeof event.action !== 'string') {
      errors.push({ field: 'action', message: 'Missing or non-string action' });
    } else if (!KNOWN_ACTIONS.has(event.action)) {
      warnings.push({ field: 'action', message: `Unknown action: ${event.action}` });
    }

    if (!event.timestamp || typeof event.timestamp !== 'string') {
      errors.push({ field: 'timestamp', message: 'Missing or non-string timestamp' });
    } else if (!ISO_TIMESTAMP_RE.test(event.timestamp)) {
      errors.push({ field: 'timestamp', message: 'Timestamp not valid ISO format' });
    }

    // userId
    if (!event.userId || typeof event.userId !== 'string' || event.userId.trim() === '') {
      errors.push({ field: 'userId', message: 'Missing or empty userId' });
    }

    // PII scan on metadata
    if (event.metadata && typeof event.metadata === 'object') {
      const meta = event.metadata as Record<string, unknown>;
      for (const [k, v] of Object.entries(meta)) {
        for (const pii of PII_PATTERNS) {
          if (pii.test(k) || (typeof v === 'string' && pii.test(v))) {
            warnings.push({
              field: `metadata.${k}`,
              message: `Potential PII in metadata field`,
            });
          }
        }
      }
    }

    // Forbidden investment language
    if (event.label && typeof event.label === 'string') {
      for (const fb of FORBIDDEN_VALUES) {
        if (fb.test(event.label)) {
          errors.push({ field: 'label', message: `Forbidden language detected: ${event.label}` });
        }
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  validateBatch(events: Array<Record<string, unknown>>): ValidationResult[] {
    return events.map((e) => this.validate(e));
  }
}
