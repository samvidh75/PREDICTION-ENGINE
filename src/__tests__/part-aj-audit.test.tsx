import { describe, expect, it } from "vitest";
import { hasBackendVocabulary, hasProductForbiddenTerms } from "../lib/compliance/forbiddenCopyAudit";

describe("Part AJ — Product copy audit fixes", () => {
  describe("Product language compliance", () => {
    it("'Awaiting data' passes forbidden terms check", () => {
      expect(hasProductForbiddenTerms("Awaiting data")).toBeNull();
      expect(hasProductForbiddenTerms("Awaiting classification")).toBeNull();
      expect(hasProductForbiddenTerms("Awaiting market data")).toBeNull();
      expect(hasProductForbiddenTerms("Research pending")).toBeNull();
      expect(hasProductForbiddenTerms("Score pending")).toBeNull();
    });

    it("'Research signals pending' passes compliance checks", () => {
      expect(hasBackendVocabulary("Research signals pending")).toBeNull();
      expect(hasProductForbiddenTerms("Research signals pending")).toBeNull();
    });

    it("'Research status' and 'Market data' are product-safe", () => {
      expect(hasBackendVocabulary("Research status")).toBeNull();
      expect(hasBackendVocabulary("Market data")).toBeNull();
      expect(hasProductForbiddenTerms("Research status")).toBeNull();
      expect(hasProductForbiddenTerms("Market data")).toBeNull();
    });

    it("'Insufficient information' is detected as forbidden", () => {
      expect(hasProductForbiddenTerms("Insufficient information")).not.toBeNull();
    });

    it("'Quote availability' is detected as backend vocabulary", () => {
      expect(hasBackendVocabulary("Quote availability")).not.toBeNull();
    });
  });

  describe("Forbidden empty-state terms", () => {
    const forbiddenTerms = [
      "Quote availability",
      "Data unavailable",
      "Insufficient information",
      "production verification",
      "symbol gaps",
      "quote freshness",
    ];

    it("all forbidden terms are detected by hasProductForbiddenTerms", () => {
      for (const term of forbiddenTerms) {
        expect(hasProductForbiddenTerms(term), `${term} should be detected`).not.toBeNull();
      }
    });
  });

  describe("Allowed product terms", () => {
    const allowedTerms = [
      "Research pending",
      "Score pending",
      "Awaiting data",
      "Awaiting market data",
      "Awaiting classification",
      "Research status",
      "Market data",
      "Assessment pending",
      "Research active",
    ];

    it("all allowed terms pass hasProductForbiddenTerms", () => {
      for (const term of allowedTerms) {
        expect(hasProductForbiddenTerms(term), `${term} should pass`).toBeNull();
      }
    });
  });
});
