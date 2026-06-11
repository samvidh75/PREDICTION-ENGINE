import React, { useLayoutEffect, useState } from "react";
import StockStoryPage from "./StockStoryPage";

const HORIZONS = [7, 30, 90, 180, 365] as const;
type PredictionHorizon = (typeof HORIZONS)[number];

function readHorizonFromUrl(): PredictionHorizon {
  if (typeof window === "undefined") return 30;
  const parsed = Number.parseInt(new URLSearchParams(window.location.search).get("horizon") ?? "", 10) as PredictionHorizon;
  return HORIZONS.includes(parsed) ? parsed : 30;
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

async function withHonestExchangeFallback(response: Response): Promise<Response> {
  if (!response.ok) return response;
  const body = await response.clone().json().catch(() => null);
  if (!body || typeof body !== "object" || body.exchange) return response;

  const headers = new Headers(response.headers);
  headers.set("content-type", "application/json");
  return new Response(JSON.stringify({ ...body, exchange: "Data unavailable" }), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * F0 compatibility boundary for the existing StockStory page.
 *
 * The legacy page remains intact while this wrapper provides the URL-backed
 * horizon selector, forwards the selected horizon to StockStory and explanation
 * requests, and prevents a missing exchange from silently becoming an invented
 * NSE label.
 */
export default function StockStoryPageF0(): JSX.Element {
  const [horizon, setHorizon] = useState<PredictionHorizon>(() => readHorizonFromUrl());

  useLayoutEffect(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const raw = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const nextInput = appendHorizon(input, horizon);
      const response = await originalFetch(nextInput, init);
      const url = new URL(raw, window.location.origin);
      return url.pathname.startsWith("/api/market-data/metadata/")
        ? withHonestExchangeFallback(response)
        : response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [horizon]);

  const selectHorizon = (nextHorizon: PredictionHorizon) => {
    const params = new URLSearchParams(window.location.search);
    params.set("horizon", String(nextHorizon));
    window.history.replaceState({}, "", `?${params.toString()}`);
    setHorizon(nextHorizon);
  };

  return (
    <>
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
