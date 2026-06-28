/**
 * Intelligence Validation Runner
 * Part 8 — Orchestrates all validation passes against intelligence outputs.
 */
import type {
  ValidationResult, ValidationRunSummary, ValidationStatus,
  ValidationSeverity, ValidationIssue, IValidator,
} from './IntelligenceValidationTypes';

// Registry of all validators
const validatorRegistry: Map<string, IValidator> = new Map();

export function registerValidator(validator: IValidator): void {
  validatorRegistry.set(validator.id, validator);
}

export function getValidator(id: string): IValidator | undefined {
  return validatorRegistry.get(id);
}

export function listValidators(): IValidator[] {
  return Array.from(validatorRegistry.values());
}

export abstract class BaseValidator implements IValidator {
  abstract readonly id: string;
  abstract readonly name: string;

  async validate(symbol: string, data: unknown): Promise<ValidationResult> {
    const start = Date.now();
    const issues: ValidationIssue[] = [];
    let totalChecks = 0;

    try {
      const result = await this.runChecks(symbol, data);
      issues.push(...result.issues);
      totalChecks = result.totalChecks;
    } catch (err) {
      issues.push({
        id: `${this.id}-error`,
        severity: 'error',
        module: this.id,
        reason: `Validator threw: ${(err as Error).message}`,
        recommendedFix: 'Investigate validator implementation',
        detectedAt: new Date().toISOString(),
      });
    }

    const errors = issues.filter(i => i.severity === 'error').length;
    const warnings = issues.filter(i => i.severity === 'warning').length;
    const infos = issues.filter(i => i.severity === 'info').length;

    return {
      status: errors > 0 ? 'fail' : (warnings > 0 ? 'pass_with_limitations' : 'pass'),
      module: this.id,
      symbol,
      issues,
      errorCount: errors,
      warningCount: warnings,
      infoCount: infos,
      passed: errors === 0,
      totalChecks,
      durationMs: Date.now() - start,
    };
  }

  async validateBatch(symbols: string[], data?: unknown[]): Promise<ValidationRunSummary> {
    const results: ValidationResult[] = [];
    const moduleResults: ValidationRunSummary['moduleResults'] = {};

    for (let i = 0; i < symbols.length; i++) {
      const result = await this.validate(symbols[i], data?.[i]);
      results.push(result);

      if (!moduleResults[this.id]) {
        moduleResults[this.id] = { passed: 0, failed: 0, warnings: 0 };
      }
      if (result.status === 'pass') moduleResults[this.id].passed++;
      else if (result.status === 'fail') moduleResults[this.id].failed++;
      else moduleResults[this.id].warnings++;
    }

    const passed = results.filter(r => r.status === 'pass').length;
    const failed = results.filter(r => r.status === 'fail').length;
    const warned = results.filter(r => r.status === 'pass_with_limitations').length;
    const totalErrors = results.reduce((sum, r) => sum + r.errorCount, 0);
    const totalWarnings = results.reduce((sum, r) => sum + r.warningCount, 0);

    let overallStatus: ValidationStatus = 'pass';
    if (failed > 0) overallStatus = 'fail';
    else if (warned > 0 || totalWarnings > 0) overallStatus = 'pass_with_limitations';

    return {
      runAt: new Date().toISOString(),
      totalSymbols: symbols.length,
      passedSymbols: passed,
      failedSymbols: failed,
      warningSymbols: warned,
      moduleResults,
      results,
      status: overallStatus,
      totalErrors,
      totalWarnings,
    };
  }

  protected abstract runChecks(
    symbol: string,
    data: unknown,
  ): Promise<{ issues: ValidationIssue[]; totalChecks: number }>;
}

export class ValidationRunner {
  private validators: IValidator[] = [];

  add(validator: IValidator): this {
    this.validators.push(validator);
    return this;
  }

  addAll(validators: IValidator[]): this {
    this.validators.push(...validators);
    return this;
  }

  async runAll(symbols: string[], data?: unknown[]): Promise<ValidationRunSummary> {
    const allResults: ValidationResult[] = [];
    const moduleResults: ValidationRunSummary['moduleResults'] = {};

    for (const validator of this.validators) {
      const batch = await validator.validateBatch(symbols, data);
      allResults.push(...batch.results);

      if (!moduleResults[validator.id]) {
        moduleResults[validator.id] = { passed: 0, failed: 0, warnings: 0 };
      }
      batch.results.forEach(r => {
        if (r.status === 'pass') moduleResults[validator.id].passed++;
        else if (r.status === 'fail') moduleResults[validator.id].failed++;
        else moduleResults[validator.id].warnings++;
      });
    }

    const passed = allResults.filter(r => r.status === 'pass').length;
    const failed = allResults.filter(r => r.status === 'fail').length;
    const warned = allResults.filter(r => r.status === 'pass_with_limitations').length;
    const totalErrors = allResults.reduce((s, r) => s + r.errorCount, 0);
    const totalWarnings = allResults.reduce((s, r) => s + r.warningCount, 0);

    let status: ValidationStatus = 'pass';
    if (failed > 0) status = 'fail';
    else if (warned > 0 || totalWarnings > 0) status = 'pass_with_limitations';

    return {
      runAt: new Date().toISOString(),
      totalSymbols: symbols.length,
      passedSymbols: passed,
      failedSymbols: failed,
      warningSymbols: warned,
      moduleResults,
      results: allResults,
      status,
      totalErrors,
      totalWarnings,
    };
  }
}
