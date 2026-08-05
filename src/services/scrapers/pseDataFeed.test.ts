// src/services/scrapers/pseDataFeed.test.ts
// Integration tests over the real, checked-in PSE Edge scraped data feed that
// backs the /api/pse/* endpoints. These prove the honesty contract: known
// symbols surface genuine records, unknown symbols return empty/null — never
// a fabricated placeholder.

import { describe, expect, it } from "vitest";
import { loadPseDisclosures } from "./PSEDisclosuresData";
import { loadPseInsiderFilings } from "./PSEInsiderFilingsData";
import { loadRealPseOwnership } from "./PSEOwnershipData";
import { loadPseSector, getSectorBySymbol } from "./PSESectorsData";

const KNOWN = "AC"; // Ayala Corporation — verified present in all feeds
const UNKNOWN = "ZZZZ";

describe("PSE scraped data feed (real data, no fabrication)", () => {
  it("loads real disclosures for a known symbol with source URLs", () => {
    const records = loadPseDisclosures(KNOWN);
    expect(records.length).toBeGreaterThan(0);
    for (const r of records) {
      expect(r.symbol).toBe(KNOWN);
      expect(typeof r.title).toBe("string");
      expect(typeof r.sourceUrl).toBe("string");
      expect(r.sourceUrl.length).toBeGreaterThan(0);
      expect(typeof r.formType).toBe("string");
    }
  });

  it("returns an empty array (not fabricated news) for an unknown symbol", () => {
    expect(loadPseDisclosures(UNKNOWN)).toEqual([]);
    expect(loadPseInsiderFilings(UNKNOWN)).toEqual([]);
  });

  it("loads real insider 17-7 filings for a known symbol", () => {
    const filings = loadPseInsiderFilings(KNOWN);
    expect(filings.length).toBeGreaterThan(0);
    for (const f of filings) {
      expect(typeof f.reportingPerson).toBe("string");
      expect(typeof f.relationship).toBe("string");
      expect(typeof f.sourceUrl).toBe("string");
    }
  });

  it("loads real ownership percentages for a known symbol", () => {
    const ownership = loadRealPseOwnership(KNOWN);
    expect(ownership).not.toBeNull();
    if (ownership) {
      expect(ownership.symbol).toBe(KNOWN);
      expect(typeof ownership.publicOwnershipPercent).toBe("number");
      expect(ownership.publicOwnershipPercent).toBeGreaterThanOrEqual(0);
      expect(ownership.publicOwnershipPercent).toBeLessThanOrEqual(100);
    }
  });

  it("returns null ownership for an unknown symbol (no placeholder)", () => {
    expect(loadRealPseOwnership(UNKNOWN)).toBeNull();
  });

  it("resolves a real sector/subsector for a known symbol", () => {
    const record = loadPseSector(KNOWN);
    expect(record).not.toBeNull();
    const sector = getSectorBySymbol(KNOWN);
    expect(typeof sector).toBe("string");
    expect(record && record.companyName).toBe("Ayala Corporation");
  });

  it("returns null sector for an unknown symbol", () => {
    expect(loadPseSector(UNKNOWN)).toBeNull();
    expect(getSectorBySymbol(UNKNOWN)).toBeNull();
  });

  it("is case-insensitive for symbol lookups", () => {
    expect(loadPseDisclosures("ac").length).toBe(loadPseDisclosures(KNOWN).length);
    const up = loadPseInsiderFilings("aC");
    const down = loadPseInsiderFilings("AC");
    expect(up.length).toBe(down.length);
  });
});
