import { buildRouteUrl, navigate, PageKey } from "../../architecture/navigation/routeCoordinator";

describe("Search Routing", () => {
  beforeEach(() => {
    // Mock window location
    vi.stubGlobal("window", {
      location: {
        href: "http://localhost:5175/",
        search: ""
      },
      history: {
        pushState: vi.fn(),
        replaceState: vi.fn()
      },
      dispatchEvent: vi.fn()
    });
  });

  it("builds correct URL for page=search", () => {
    const url = buildRouteUrl({ page: "search" });
    expect(url.searchParams.get("page")).toBe("search");
  });

  it("builds correct URL with search query parameter", () => {
    const url = buildRouteUrl({
      page: "search",
      searchOverlay: { q: "RELIANCE" }
    });
    expect(url.searchParams.get("page")).toBe("search");
    expect(url.searchParams.get("search")).toBe("1");
    expect(url.searchParams.get("q")).toBe("RELIANCE");
  });
});
