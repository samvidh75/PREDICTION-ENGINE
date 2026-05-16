export type PageKey = "landing" | "about" | "stock" | "company" | "community" | "practice" | "assistant" | "explore" | "dashboard";

export type ExploreRoute = {
  kind: string;
  id: string;
};

export type SearchOverlayRoute = {
  q: string;
};

export type NavigateMode = "push" | "replace" | "hard";

const URL_EVENT_NAME = "urlchange";

function getCurrentUrl(): URL {
  return new URL(window.location.href);
}

function dispatchUrlChange(): void {
  window.dispatchEvent(new Event(URL_EVENT_NAME));
}

function setOrDelete(url: URL, key: string, value: string | undefined, deleteWhenEmpty = true): void {
  if (value === undefined) {
    url.searchParams.delete(key);
    return;
  }
  const trimmed = value.trim();
  if (deleteWhenEmpty && trimmed.length === 0) {
    url.searchParams.delete(key);
    return;
  }
  url.searchParams.set(key, trimmed);
}

export function buildRouteUrl(args: {
  page: PageKey;

  // explore
  explore?: ExploreRoute;

  // stock search overlay
  searchOverlay?: SearchOverlayRoute;

  // stock/other optional params
  ticker?: string;

  // preserve existing params (e.g. skipOnboarding) by listing param keys here
  preserveParamKeys?: string[];
}): URL {
  const url = getCurrentUrl();

  const preserve = new Set<string>(args.preserveParamKeys ?? []);
  // Always start from a clean slate for the keys we manage.
  // Preserve any explicit param keys that callers want retained.
  // (We only touch managed keys below.)
  if (!preserve.has("page")) url.searchParams.delete("page");
  if (!preserve.has("kind")) url.searchParams.delete("kind");
  if (!preserve.has("id")) url.searchParams.delete("id");
  if (!preserve.has("search")) url.searchParams.delete("search");
  if (!preserve.has("q")) url.searchParams.delete("q");
  if (!preserve.has("ticker")) url.searchParams.delete("ticker");

  url.searchParams.set("page", args.page);

  if (args.page === "explore" && args.explore) {
    url.searchParams.set("kind", args.explore.kind);
    url.searchParams.set("id", args.explore.id);
  }

  if (args.searchOverlay) {
    url.searchParams.set("search", "1");
    url.searchParams.set("q", args.searchOverlay.q);
  }

  setOrDelete(url, "ticker", args.ticker);

  return url;
}

export function navigate(args: {
  page: PageKey;

  explore?: ExploreRoute;
  searchOverlay?: SearchOverlayRoute;
  ticker?: string;

  preserveParamKeys?: string[];

  mode?: NavigateMode;
}): void {
  const url = buildRouteUrl({
    page: args.page,
    explore: args.explore,
    searchOverlay: args.searchOverlay,
    ticker: args.ticker,
    preserveParamKeys: args.preserveParamKeys,
  });

  const mode = args.mode ?? "push";

  if (mode === "hard") {
    window.location.href = url.toString();
    return;
  }

  if (mode === "replace") {
    window.history.replaceState({}, "", url.toString());
    dispatchUrlChange();
    return;
  }

  window.history.pushState({}, "", url.toString());
  dispatchUrlChange();
}

export function navigateToExplore(kind: string, id: string, opts?: { mode?: NavigateMode; preserveParamKeys?: string[] }): void {
  navigate({
    page: "explore",
    explore: { kind, id },
    mode: opts?.mode ?? "push",
    preserveParamKeys: opts?.preserveParamKeys,
  });
}

export function navigateToAbout(opts?: { mode?: NavigateMode; preserveParamKeys?: string[] }): void {
  navigate({
    page: "about",
    mode: opts?.mode ?? "push",
    preserveParamKeys: opts?.preserveParamKeys,
  });
}

export function navigateToStock(opts?: {
  mode?: NavigateMode;
  preserveParamKeys?: string[];
  ticker?: string;
  openSearchQ?: string;
}): void {
  const searchOverlay = opts?.openSearchQ ? { q: opts.openSearchQ } : undefined;

  navigate({
    page: "stock",
    ticker: opts?.ticker,
    searchOverlay,
    mode: opts?.mode ?? "push",
    preserveParamKeys: opts?.preserveParamKeys,
  });
}
