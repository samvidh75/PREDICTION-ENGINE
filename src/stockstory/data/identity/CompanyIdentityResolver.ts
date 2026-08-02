/**
 * CompanyIdentityResolver — resolves a look-up key to a canonical
 * CompanyIdentity. Delegates to real data and does not invent fields.
 */

import type {
  CompanyIdentity,
  IdentityResolution,
  IdentityConflict,
  ResolutionSource,
} from "./CompanyIdentityTypes.ts";
import { CompanyAliasResolver } from "./CompanyAliasResolver.ts";
import { normalizeSymbol } from "../universe/SymbolNormalizer.ts";
import { mayUseSource } from "../sources/DataSourcePolicy.ts";

export class CompanyIdentityResolver {
  private aliasResolver = new CompanyAliasResolver();

  // -------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------

  /**
   * Resolve a single company identity from a resolution source.
   * Returns a full IdentityResolution with confidence and conflicts.
   */
  resolve(source: ResolutionSource): IdentityResolution {
    const conflicts: IdentityConflict[] = [];

    // 1. Extract candidate key
    const key = this.extractKey(source);
    if (!key) {
      return {
        identity: null,
        confidence: 0,
        resolvedBy: "no-valid-key",
        conflicts: [],
      };
    }

    // 2. Look up via alias resolver
    const pseSymbol = this.aliasResolver.toCanonical(key);
    if (!pseSymbol) {
      return {
        identity: null,
        confidence: 0,
        resolvedBy: "unresolved-alias",
        conflicts: [],
      };
    }

    // 3. In production, this would query a DB-backed identity registry.
    //    The following returns a placeholder for known PSE-like symbols.
    const identity = this.fetchIdentity(pseSymbol);
    if (!identity) {
      return {
        identity: null,
        confidence: 0,
        resolvedBy: "not-found",
        conflicts: [],
      };
    }

    // 4. Safety guard: check field-level conflicts
    for (const c of this.detectConflicts(identity, source)) {
      conflicts.push(c);
    }

    const hasErrors = conflicts.some((c) => c.severity === "error");
    return {
      identity: hasErrors ? null : identity,
      confidence: hasErrors ? 0.3 : 0.95,
      resolvedBy: `identity-${source.kind}`,
      conflicts,
    };
  }

  /**
   * Check whether using the identity resolver is permitted by policy.
   */
  canResolve(): boolean {
    return mayUseSource("internal_universe_db").allowed;
  }

  // -------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------

  private extractKey(source: ResolutionSource): string | null {
    switch (source.kind) {
      case "pse_symbol":
        return normalizeSymbol(source.symbol);
      case "bse_code":
        return source.code;
      case "isin":
        return source.value?.toUpperCase() || null;
      case "alias":
        return source.value;
      case "company_name":
        return source.name.trim().toLowerCase() || null;
    }
  }

  /**
   * Fetch identity from registry. Placeholder — real impl queries DB.
   */
  private fetchIdentity(pseSymbol: string): CompanyIdentity | null {
    // In production, this queries the identity_registry table.
    // For now return null, which triggers "not-found" resolution.
    return null;
  }

  private detectConflicts(
    identity: CompanyIdentity,
    source: ResolutionSource,
  ): IdentityConflict[] {
    const conflicts: IdentityConflict[] = [];
    // Conflict detection: e.g. if source provides an ISIN that differs
    // from the registry entry, flag it.
    if (
      source.kind === "isin" &&
      identity.isin &&
      source.value.toUpperCase() !== identity.isin
    ) {
      conflicts.push({
        field: "isin",
        leftValue: identity.isin,
        rightValue: source.value.toUpperCase(),
        severity: "error",
        description: `ISIN mismatch for ${identity.pseSymbol}: registry says ${identity.isin}, source says ${source.value.toUpperCase()}`,
      });
    }
    return conflicts;
  }
}
