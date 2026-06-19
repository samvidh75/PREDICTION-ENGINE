/**
 * AntiCheatingAuditor — TRACK-32 Phase 10
 *
 * Verifies data integrity of prediction_registry against common biases:
 *   - No look-ahead bias: prediction_date precedes validated_at
 *   - No survivorship bias: predicted symbols existed at prediction time
 *   - No retroactive edits: created_at timestamps are consistent
 *   - No prediction rewrites: no duplicate tuples with differing scores
 */

import pool from '../db/index';

export interface AuditResult {
  passed: boolean;
  findings: string[];
  recommendations: string[];
}

export class AntiCheatingAuditor {
  async audit(): Promise<AuditResult> {
    const findings: string[] = [];
    const recommendations: string[] = [];
    let passed = true;

    // ── 1. Look-ahead bias ───────────────────────────────
    try {
      // Check records with missing horizon — must fail closed
      const missingHorizonResult = await pool.query(
        `SELECT COUNT(*) AS cnt
         FROM prediction_registry
         WHERE validation_status = 'validated'
           AND validated_at IS NOT NULL
           AND prediction_horizon IS NULL`
      );
      const missingHorizonCount = parseInt(missingHorizonResult.rows[0].cnt, 10);
      if (missingHorizonCount > 0) {
        passed = false;
        findings.push(`Look-ahead bias: ${missingHorizonCount} validated records have NULL prediction_horizon — cannot verify horizon integrity.`);
        recommendations.push('All validated predictions must have a non-null prediction_horizon.');
      }

      // Check records where validated_at is not strictly after prediction_date + horizon
      const lookAheadResult = await pool.query(
        `SELECT COUNT(*) AS cnt
         FROM prediction_registry
         WHERE validation_status = 'validated'
           AND validated_at IS NOT NULL
           AND prediction_horizon IS NOT NULL
           AND validated_at <= (prediction_date::timestamp + (prediction_horizon || ' days')::interval)`
      );
      const lookAheadCount = parseInt(lookAheadResult.rows[0].cnt, 10);
      if (lookAheadCount > 0) {
        passed = false;
        findings.push(`Look-ahead bias detected: ${lookAheadCount} validated records have validated_at <= prediction_date + horizon days.`);
        recommendations.push('Investigate and correct timestamps. All validated_at must be strictly after prediction_date + horizon days.');
      } else if (missingHorizonCount === 0) {
        findings.push('No look-ahead bias: all validated_at > prediction_date + horizon for validated records.');
      }
    } catch (err: any) {
      findings.push(`Look-ahead bias check failed (DB error): ${err.message}`);
      recommendations.push('Ensure validated_at and prediction_date columns exist and are typed correctly.');
    }

    // ── 2. Survivorship bias ──────────────────────────────
    try {
      const survivorshipResult = await pool.query(
        `SELECT COUNT(*) AS cnt
         FROM prediction_registry pr
         LEFT JOIN master_security_registry msr ON pr.symbol = msr.symbol
         WHERE msr.symbol IS NULL`
      );
      const survivorshipCount = parseInt(survivorshipResult.rows[0].cnt, 10);
      if (survivorshipCount > 0) {
        passed = false;
        findings.push(`Survivorship bias detected: ${survivorshipCount} predictions reference symbols not in master_security_registry.`);
        recommendations.push('These symbols may have been delisted. Verify inclusion in the universe at prediction time.');
      } else {
        findings.push('No survivorship bias: all predicted symbols exist in master_security_registry.');
      }
    } catch (err: any) {
      findings.push(`Survivorship bias check failed (DB error): ${err.message}`);
      recommendations.push('Ensure master_security_registry table is populated and accessible.');
    }

    // ── 3. Retroactive edits ──────────────────────────────
    try {
      const retroEditResult = await pool.query(
        `SELECT COUNT(*) AS cnt
         FROM prediction_registry
         WHERE created_at::date > prediction_date + INTERVAL '1 day'`
      );
      const retroEditCount = parseInt(retroEditResult.rows[0].cnt, 10);
      if (retroEditCount > 0) {
        passed = false;
        findings.push(`Retroactive edit detected: ${retroEditCount} predictions were created more than 1 day after prediction_date.`);
        recommendations.push('Predictions must be recorded on or before prediction_date + 1 day. Timestamps may have been backfilled incorrectly.');
      } else {
        findings.push('No retroactive edits: all created_at are within 1 day of prediction_date.');
      }
    } catch (err: any) {
      findings.push(`Retroactive edit check failed (DB error): ${err.message}`);
      recommendations.push('Ensure created_at and prediction_date columns exist and are typed correctly.');
    }

    // ── 4. Prediction rewrites ────────────────────────────
    try {
      const rewriteResult = await pool.query(
        `SELECT symbol, prediction_date, prediction_horizon, COUNT(*) AS cnt
         FROM prediction_registry
         GROUP BY symbol, prediction_date, prediction_horizon
         HAVING COUNT(*) > 1`
      );
      if (rewriteResult.rows.length > 0) {
        passed = false;
        const examples = rewriteResult.rows.slice(0, 3).map(
          (r: any) => `${r.symbol}/${r.prediction_date}/${r.prediction_horizon}d`
        ).join(', ');
        findings.push(`Prediction rewrites detected: ${rewriteResult.rows.length} duplicate (symbol, date, horizon) tuples. Examples: ${examples}.`);
        recommendations.push('Remove duplicate predictions. Only the first prediction for each (symbol, date, horizon) should remain.');
      } else {
        findings.push('No prediction rewrites: all (symbol, prediction_date, prediction_horizon) tuples are unique.');
      }
    } catch (err: any) {
      findings.push(`Prediction rewrite check failed (DB error): ${err.message}`);
      recommendations.push('Verify the UNIQUE constraint on prediction_registry (symbol, prediction_date, prediction_horizon).');
    }

    // ── 5. Immutable audit trail ──────────────────────────
    try {
      const mutableCheckResult = await pool.query(
        `SELECT COUNT(*) AS cnt FROM prediction_registry WHERE created_by IS NULL`
      );
      const missingAuditCount = parseInt(mutableCheckResult.rows[0].cnt, 10);
      if (missingAuditCount > 0) {
        passed = false;
        findings.push(`Missing audit trail: ${missingAuditCount} predictions have no created_by value.`);
        recommendations.push('Backfill created_by for all prediction records.');
      } else {
        findings.push('Audit trail complete: all predictions have created_by populated.');
      }
    } catch (err: any) {
      findings.push(`Audit trail check failed (DB error): ${err.message}`);
    }

    // ── 6. Price at prediction consistency ────────────────
    try {
      const priceConsistencyResult = await pool.query(
        `SELECT COUNT(*) AS cnt
         FROM prediction_registry
         WHERE price_at_prediction IS NULL OR price_at_prediction <= 0`
      );
      const missingPriceCount = parseInt(priceConsistencyResult.rows[0].cnt, 10);
      if (missingPriceCount > 0) {
        findings.push(`Minor: ${missingPriceCount} predictions have missing or zero price_at_prediction. Returns cannot be computed for these.`);
        recommendations.push('Populate price_at_prediction from daily_prices for the prediction_date.');
      }
    } catch (err: any) {
      findings.push(`Price consistency check failed (DB error): ${err.message}`);
    }

    return { passed, findings, recommendations };
  }
}

export const antiCheatingAuditor = new AntiCheatingAuditor();
export default AntiCheatingAuditor;
