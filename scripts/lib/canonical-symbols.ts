/**
 * Canonical PSE symbol list.
 *
 * The repo carries three unreconciled symbol sets:
 *   - data/stock-universe.json (294) — was placeholder-generated, now rebuilt
 *     from this list by scripts/generate-stock-universe.ts
 *   - data/pse-sectors.json (282) — real scrape of PSE Edge's company directory
 *   - data/pse-universe.json / data/pse-symbols.json (392) — not imported by any
 *     live code under src/, script-only, provenance unverified
 *
 * pse-sectors.json wins as the canonical list: it is the only set verified to
 * come from PSE Edge, and it is already the live source behind
 * getSectorBySymbol() on the real /api/stock/:symbol path. Anything not in it
 * has no confirmed sector, so we would be guessing to include it.
 */
import { getAllPseSectors } from "../../src/services/scrapers/PSESectorsData";

/** Every PSE symbol with a real, sourced sector, sorted for stable output. */
export function getCanonicalSymbols(): string[] {
  return Array.from(getAllPseSectors().keys()).sort();
}
