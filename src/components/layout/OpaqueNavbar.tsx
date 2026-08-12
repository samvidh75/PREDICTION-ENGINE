import { useRef, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Search, TrendingUp, BarChart3, Home, BookOpen } from "lucide-react";
import { colors, radius, components } from "../../design/tokens";

/**
 * OpaqueNavbar — Fixed-position top navigation bar with opaque background
 * (bg-slate-950/95 backdrop-blur-md) so scrolling content never bleeds through.
 * Includes global search shortcut (Cmd+K / Ctrl+K) for instant PSE stock search.
 */
export function OpaqueNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ symbol: string; name: string }>>([]);
  const [showResults, setShowResults] = useState(false);

  // Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleSearch = async (value: string) => {
    setQuery(value);
    if (value.trim().length < 1) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    try {
      const { PSE_SYMBOLS } = await import("../../config/providers");
      const { PSE_COMMON_STOCKS } = await import("../../constants/pseTickers");
      const q = value.toUpperCase();
      const results = PSE_SYMBOLS
        .filter((s: string) => s.startsWith(q))
        .slice(0, 8)
        .map((s: string) => ({
          symbol: s,
          name: PSE_COMMON_STOCKS[s]?.name ?? s,
        }));
      setSearchResults(results);
      setShowResults(results.length > 0);
    } catch {
      setShowResults(false);
    }
  };

  const navigateToStock = (symbol: string) => {
    navigate(`/stock/${symbol}`);
    setQuery("");
    setShowResults(false);
    searchRef.current?.blur();
  };

  const navItems = [
    { path: "/dashboard", label: "Dashboard", icon: Home },
    { path: "/live-market", label: "Live Market", icon: TrendingUp },
    { path: "/scanner", label: "Scanner", icon: BarChart3 },
    { path: "/analyst", label: "Research", icon: BookOpen },
  ];

  return (
    <nav
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0,
        height: components.navBar.heightDesktop,
        background: "rgba(2, 6, 23, 0.95)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        padding: "0 20px",
        gap: 16,
      }}
    >
      {/* Logo */}
      <div
        onClick={() => navigate("/")}
        style={{
          fontWeight: 700, fontSize: 15, color: colors.textPrimary,
          cursor: "pointer", whiteSpace: "nowrap",
          display: "flex", alignItems: "center", gap: 6,
        }}
      >
        <TrendingUp size={16} color={colors.accentRed} />
        StockEX
      </div>

      {/* Navigation links */}
      <div style={{ display: "flex", gap: 4, flex: 1 }}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path !== "/" && location.pathname.startsWith(item.path));
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                display: "flex", alignItems: "center", gap: 4,
                padding: "6px 12px", borderRadius: radius.sm, border: "none",
                background: isActive ? "rgba(255,255,255,0.08)" : "transparent",
                color: isActive ? colors.textPrimary : colors.textSecondary,
                fontSize: 12, fontWeight: 500, cursor: "pointer",
                transition: "background 150ms ease, color 150ms ease",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                  e.currentTarget.style.color = colors.textPrimary;
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = colors.textSecondary;
                }
              }}
            >
              <item.icon size={13} strokeWidth={1.5} />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Search bar */}
      <div style={{ position: "relative", width: 240 }}>
        <div style={{ position: "relative" }}>
          <Search
            size={13}
            style={{
              position: "absolute", left: 10, top: "50%",
              transform: "translateY(-50%)", color: colors.stone,
              pointerEvents: "none",
            }}
          />
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => { if (searchResults.length > 0) setShowResults(true); }}
            onBlur={() => setTimeout(() => setShowResults(false), 200)}
            placeholder="Search PSE stocks...  ⌘K"
            style={{
              width: "100%", padding: "6px 10px 6px 30px", fontSize: 12,
              border: "1px solid rgba(255,255,255,0.1)", borderRadius: radius.sm,
              background: "rgba(255,255,255,0.04)", color: colors.textPrimary,
              outline: "none", boxSizing: "border-box",
            }}
          />
        </div>

        {/* Search results dropdown */}
        {showResults && (
          <div
            style={{
              position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4,
              background: "rgba(18, 18, 20, 0.95)",
              border: "1px solid rgba(255,255,255,0.1)", borderRadius: radius.sm,
              overflow: "hidden", zIndex: 200,
            }}
          >
            {searchResults.map((r) => (
              <button
                key={r.symbol}
                onClick={() => navigateToStock(r.symbol)}
                style={{
                  display: "flex", justifyContent: "space-between",
                  alignItems: "center", width: "100%", padding: "8px 12px",
                  background: "transparent", border: "none",
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                  cursor: "pointer", textAlign: "left",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                <span style={{ fontFamily: "monospace", fontWeight: 600, fontSize: 12, color: colors.textPrimary }}>
                  {r.symbol}
                </span>
                <span style={{ color: colors.stone, fontSize: 11 }}>{r.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
