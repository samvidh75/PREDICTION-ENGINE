/**
 * Formula executor for custom stock scoring
 * Supports mathematical expressions like: (ROE * 10) - (P/E / 20) + momentum
 */

export interface FormulaResult {
  score: number;
  formula: string;
  variables: Record<string, number>;
  timestamp: number;
}

export interface SavedFormula {
  id: string;
  name: string;
  description: string;
  formula: string;
  createdAt: number;
  updatedAt: number;
  isPublic: boolean;
}

export class FormulaExecutor {
  private savedFormulas: Map<string, SavedFormula> = new Map();
  private readonly STORAGE_KEY = 'prediction-engine:formulas';

  constructor() {
    this.loadFormulas();
  }

  /**
   * Parse and execute formula with stock data
   * Formula example: "(ROE * 10) - (PE / 20) + (revenueGrowth * 2)"
   */
  executeFormula(
    formula: string,
    variables: Record<string, number>
  ): FormulaResult | { error: string } {
    try {
      // Sanitize formula - only allow alphanumeric, operators, and parentheses
      const sanitized = this.sanitizeFormula(formula);

      // Replace variable names with their values
      let expression = sanitized;
      for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`\\b${key}\\b`, 'gi');
        expression = expression.replace(regex, `(${value})`);
      }

      // Evaluate expression safely
      const score = this.safeEval(expression);

      if (isNaN(score) || !isFinite(score)) {
        return { error: 'Formula resulted in invalid number' };
      }

      return {
        score: Math.round(score * 100) / 100,
        formula,
        variables,
        timestamp: Date.now(),
      };
    } catch (error) {
      return { error: `Formula execution failed: ${String(error)}` };
    }
  }

  /**
   * Validate formula syntax
   */
  validateFormula(formula: string): { valid: boolean; error?: string } {
    try {
      const sanitized = this.sanitizeFormula(formula);

      // Check for balanced parentheses
      let balance = 0;
      for (const char of sanitized) {
        if (char === '(') balance++;
        if (char === ')') balance--;
        if (balance < 0) {
          return { valid: false, error: 'Unbalanced parentheses' };
        }
      }
      if (balance !== 0) {
        return { valid: false, error: 'Unbalanced parentheses' };
      }

      // Check for valid operators
      // eslint-disable-next-line no-useless-escape
      if (!/^[0-9a-zA-Z\s()*/+\-]*$/.test(sanitized)) {
        return { valid: false, error: 'Invalid characters in formula' };
      }

      // Try to parse
      this.safeEval(sanitized.replace(/[a-zA-Z]+/g, '1'));
      return { valid: true };
    } catch (error) {
      return { valid: false, error: String(error) };
    }
  }

  /**
   * Save formula for later use
   */
  saveFormula(
    name: string,
    description: string,
    formula: string,
    isPublic = false
  ): SavedFormula {
    const id = `formula_${Date.now()}`;
    const saved: SavedFormula = {
      id,
      name,
      description,
      formula,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isPublic,
    };

    this.savedFormulas.set(id, saved);
    this.persistFormulas();
    return saved;
  }

  /**
   * Get saved formula by ID
   */
  getFormula(id: string): SavedFormula | null {
    return this.savedFormulas.get(id) || null;
  }

  /**
   * Get all saved formulas
   */
  getAllFormulas(): SavedFormula[] {
    return Array.from(this.savedFormulas.values());
  }

  /**
   * Delete formula
   */
  deleteFormula(id: string): boolean {
    const deleted = this.savedFormulas.delete(id);
    if (deleted) {
      this.persistFormulas();
    }
    return deleted;
  }

  /**
   * Export formulas
   */
  exportFormulas(): string {
    return JSON.stringify(Array.from(this.savedFormulas.values()), null, 2);
  }

  /**
   * Import formulas
   */
  importFormulas(jsonString: string): { success: boolean; count: number; error?: string } {
    try {
      const formulas = JSON.parse(jsonString) as SavedFormula[];
      let count = 0;

      for (const formula of formulas) {
        if (formula.id && formula.name && formula.formula) {
          this.savedFormulas.set(formula.id, formula);
          count++;
        }
      }

      this.persistFormulas();
      return { success: true, count };
    } catch (error) {
      return { success: false, count: 0, error: String(error) };
    }
  }

  /**
   * Get formula suggestions based on variable
   */
  getSuggestions(): string[] {
    return [
      'ROE * 10',
      '(ROE * 10) - (PE / 20)',
      '(ROE * 10) - (PE / 20) + (dividendYield * 5)',
      'revenueGrowth * 2',
      '(profitMargin * 5) - (debtToEquity * 10)',
      '(1 / PE) * 100',
      'ROE / PE',
      '(revenueGrowth + profitMargin) / 2',
    ];
  }

  /**
   * Sanitize formula to prevent injection
   */
  private sanitizeFormula(formula: string): string {
    return formula
      .replace(/[^0-9a-zA-Z\s()*/+-.]/g, '') // Remove invalid characters
      .trim();
  }

  /**
   * Safely evaluate mathematical expression
   */
  private safeEval(expression: string): number {
    // Remove whitespace
    const clean = expression.replace(/\s/g, '');

    // Check for invalid patterns
    // eslint-disable-next-line no-useless-escape
    if (/[^0-9.()*/+\-]/.test(clean)) {
      throw new Error('Invalid characters in expression');
    }

    // Use Function constructor instead of eval for slight safety improvement
    // Still should only be used with sanitized input
    try {
      const result = Function('"use strict"; return (' + clean + ')')();
      return result as number;
    } catch {
      throw new Error('Failed to evaluate expression');
    }
  }

  /**
   * Persist formulas to localStorage
   */
  private persistFormulas() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(Array.from(this.savedFormulas.values())));
    } catch (error) {
      console.error('[FormulaExecutor] Failed to persist formulas:', error);
    }
  }

  /**
   * Load formulas from localStorage
   */
  private loadFormulas() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const formulas = JSON.parse(stored) as SavedFormula[];
        for (const formula of formulas) {
          this.savedFormulas.set(formula.id, formula);
        }
      }
    } catch (error) {
      console.error('[FormulaExecutor] Failed to load formulas:', error);
    }
  }
}

export const formulaExecutor = new FormulaExecutor();
