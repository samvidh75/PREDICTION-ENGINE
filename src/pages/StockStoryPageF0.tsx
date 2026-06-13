import React, { useLayoutEffect, useState } from "react";
import StockWorkspaceBar from "../components/company/StockWorkspaceBar";
import StockStoryPage from "./StockStoryPage";

const HORIZONS = [7, 30, 90, 180, 365] as const;
type PredictionHorizon = (typeof HORIZONS)[number];

function readHorizonFromUrl(): PredictionHorizon {
  if (typeof window === "undefined") return 30;
  const parsed = Number.parseInt(new URLSearchParams(window.location.search).get("horizon") ?? "", 10) as PredictionHorizon;
  return HORIZONS.includes(parsed) ? parsed : 30;
}

function readTickerFromUrl(): string {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.search);
  return (params.get("id") ?? params.get("symbol") ?? params.get("ticker") ?? params.get("companyId") ?? "")
    .toUpperCase()
    .trim();
}

function appendHorizon(input: RequestInfo | URL, horizon: PredictionHorizon): RequestInfo | URL {
  const raw = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  const url = new URL(raw, window.location.origin);
  if (!url.pathname.startsWith("/api/stockstory/") && !url.pathname.startsWith("/api/predictions/explain/")) {
    return input;
  }

  url.searchParams.set("horizon", String(horizon));
  const next = raw.startsWith("http") ? url.toString() : `${url.pathname}${url.search}${url.hash}`;
  if (input instanceof Request) return new Request(next, input);
  if (input instanceof URL) return new URL(next, window.location.origin);
  return next;
}

function unavailableMetadata(symbol: string): Record<string, unknown> {
  return {
    symbol,
    companyName: "",
    sector: "",
    industry: "",
    exchange: "Data unavailable",
    currency: "Data unavailable",
    verificationStatus: "INVALID",
    verificationReasons: ["metadata_unavailable"],
    enrichmentSource: "fallback",
  };
}

async function withHonestMetadataFallback(response: Response, symbol: string): Promise<Response> {
  const body = await response.clone().json().catch(() => null) as Record<string, unknown> | null;
  const headers = new Headers(response.headers);
  headers.set("content-type", "application/json");

  if (!response.ok || !body || typeof body !== "object") {
    return new Response(JSON.stringify(unavailableMetadata(symbol)), {
      status: 200,
      headers,
    });
  }

  if (body.exchange) return response;

  return new Response(JSON.stringify({ ...body, exchange: "Data unavailable" }), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function unwrapExplanationEnvelope(response: Response): Promise<Response> {
  if (!response.ok) return response;
  const body = await response.clone().json().catch(() => null) as {
    status?: string;
    data?: unknown;
    message?: string | null;
    reason?: string | null;
  } | null;

  if (!body || typeof body !== "object" || !("status" in body) || !("data" in body)) return response;

  if (!body.data) {
    return new Response(JSON.stringify({ error: body.message || body.reason || "Explanation unavailable" }), {
      status: 503,
      headers: { "content-type": "application/json" },
    });
  }

  return new Response(JSON.stringify(body.data), {
    status: response.status,
    statusText: response.statusText,
    headers: { "content-type": "application/json" },
  });
}

/**
 * F0 compatibility boundary for the existing StockStory page.
 *
 * The legacy page remains intact while this wrapper provides the URL-backed
 * horizon selector, forwards the selected horizon to StockStory and explanation
 * requests, adapts the analytical explanation envelope for the legacy tab, and
 * prevents a missing exchange from silently becoming an invented NSE label.
 */
export default function StockStoryPageF0(): JSX.Element {
  const [horizon, setHorizon] = useState<PredictionHorizon>(() => readHorizonFromUrl());
  const ticker = readTickerFromUrl();

  useLayoutEffect(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const raw = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const url = new URL(raw, window.location.origin);
      const response = await originalFetch(appendHorizon(input, horizon), init);

      if (url.pathname.startsWith("/api/market-data/metadata/")) {
        const symbol = decodeURIComponent(url.pathname.split("/").pop() || ticker).toUpperCase().trim();
        return withHonestMetadataFallback(response, symbol);
      }
      if (url.pathname.startsWith("/api/predictions/explain/")) return unwrapExplanationEnvelope(response);
      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [horizon, ticker]);

  const selectHorizon = (nextHorizon: PredictionHorizon) => {
    const params = new URLSearchParams(window.location.search);
    params.set("horizon", String(nextHorizon));
    window.history.replaceState({}, "", `?${params.toString()}`);
    setHorizon(nextHorizon);
  };

  return (
    <>
      <StockWorkspaceBar ticker={ticker} horizon={horizon} />
      <section
        aria-label="Prediction horizon"
        className="mx-auto mb-4 flex w-full max-w-7xl flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-white"
      >
        <span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-white/45">Horizon</span>
        {HORIZONS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => selectHorizon(option)}
            aria-pressed={horizon === option}
            className={`rounded-md px-2 py-1 text-[10px] font-bold transition-colors ${
              horizon === option ? "bg-cyan-500/20 text-cyan-300" : "text-white/45 hover:text-white"
            }`}
          >
            {option}D
          </button>
        ))}
      </section>
      <StockStoryPage key={horizon} />
    </>
  );
}
