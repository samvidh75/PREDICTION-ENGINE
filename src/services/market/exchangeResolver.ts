export type ExchangeVenue = "NSE" | "BSE" | "SME" | "UNKNOWN";

export type ResolveExchangeInput = {
  ticker: string;
  exchangeParam?: string | null;
};

function normalizeExchange(raw: string | undefined | null): ExchangeVenue {
  if (!raw) return "UNKNOWN";
  const v = String(raw).trim().toUpperCase();
  if (v === "NSE") return "NSE";
  if (v === "BSE") return "BSE";
  if (v === "SME") return "SME";
  return "UNKNOWN";
}

function splitPrefixedTicker(ticker: string): { exchange: ExchangeVenue; cleanTicker: string } {
  // Supported prefix forms:
  // - "NSE:RELIANCE"
  // - "BSE:500114"
  // - "SME:XYZ"
  const m = String(ticker).trim().match(/^(NSE|BSE|SME)\s*:\s*([A-Z0-9.\-]+)$/i);
  if (!m) return { exchange: "UNKNOWN", cleanTicker: String(ticker).trim() };

  const ex = normalizeExchange(m[1]);
  const cleanTicker = m[2] ?? "";
  return { exchange: ex, cleanTicker: cleanTicker.trim() };
}

/**
 * Deterministic exchange resolution:
 * - Prefer explicit URL exchange param if valid.
 * - Else parse ticker prefix "NSE:..." / "BSE:..." / "SME:..."
 * - Else infer from ticker shape:
 *   - numeric tickers default to BSE (SME listings are typically numeric too; we keep default conservative)
 *   - otherwise default to NSE
 */
export function resolveExchangeAndTicker(input: ResolveExchangeInput): {
  exchange: ExchangeVenue;
  normalizedTicker: string;
} {
  const rawTicker = String(input.ticker ?? "").trim();
  const exchangeFromParam = normalizeExchange(input.exchangeParam);

  if (!rawTicker) {
    return { exchange: "UNKNOWN", normalizedTicker: "" };
  }

  if (exchangeFromParam !== "UNKNOWN") {
    // If param is valid, we don't remove any prefixes from ticker; we only normalize known NSE/BSE/SME prefix forms.
    const split = splitPrefixedTicker(rawTicker);
    const normalizedTicker = split.cleanTicker || rawTicker.toUpperCase();
    return { exchange: exchangeFromParam, normalizedTicker };
  }

  const prefixed = splitPrefixedTicker(rawTicker);
  if (prefixed.exchange !== "UNKNOWN") {
    return { exchange: prefixed.exchange, normalizedTicker: prefixed.cleanTicker.toUpperCase() };
  }

  // Shape inference (best-effort, conservative)
  const isNumeric = /^[0-9]{1,6}$/.test(rawTicker);
  if (isNumeric) {
    return { exchange: "BSE", normalizedTicker: rawTicker };
  }

  return { exchange: "NSE", normalizedTicker: rawTicker.toUpperCase() };
}
