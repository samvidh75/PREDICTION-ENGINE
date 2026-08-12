import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  Home as HomeIcon, Search as SearchIcon, Star, LayoutGrid, Shield,
  MessageCircle, TrendingUp, Bell, BarChart2, ChevronRight,
} from "lucide-react";
import { NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { colors, typography, space, radius, layout, components, animation } from "../design/tokens";
import { BrandMark } from "../components/BrandMark";
import { MarketStatusBadge } from "../components/MarketStatusBadge";
import { ResearchProfileModal } from "../components/ResearchProfileModal";
import { useKeyboardShortcuts, KeyboardHelpOverlay } from "../hooks/useKeyboardShortcuts";
import { FloatingAiAssistant } from "../components/FloatingAiAssistant";

/* ============================================================================
   AppShell — Professional financial platform shell
   Deep navy sidebar, blue active state, no glassmorphism.
   ============================================================================ */

const NAV_PRIMARY = [
  { to: "/",          label: "Dashboard",  icon: HomeIcon    },
  { to: "/scanner",   label: "Scanner",    icon: SearchIcon  },
  { to: "/sectors",   label: "Sectors",    icon: LayoutGrid  },
  { to: "/watchlist", label: "Watchlist",  icon: Star        },
] as const;

const NAV_PORTFOLIO = [
  { to: "/portfolio",  label: "Portfolio",    icon: BarChart2    },
  { to: "/alerts",     label: "Alerts",       icon: Bell         },
  { to: "/compare",    label: "Compare",      icon: TrendingUp   },
] as const;

const NAV_TOOLS = [
  { to: "/chat",  label: "AI Research", icon: MessageCircle },
  { to: "/trust", label: "Data Sources", icon: Shield       },
] as const;

const MOBILE_NAV = [
  { to: "/",          label: "Home",      icon: HomeIcon    },
  { to: "/scanner",   label: "Scanner",   icon: SearchIcon  },
  { to: "/watchlist", label: "Watch",     icon: Star        },
  { to: "/portfolio", label: "Portfolio", icon: BarChart2   },
  { to: "/chat",      label: "AI",        icon: MessageCircle },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [helpOpen, setHelpOpen] = useState(false);
  const [showFeedbackFab, setShowFeedbackFab] = useState(
    () => document.body.dataset.onboardingActive !== "true",
  );

  useKeyboardShortcuts({
    handlers: {
      "toggle-help": () => setHelpOpen((o) => !o),
      "toggle-compare": () => navigate("/compare"),
      "toggle-track": () => navigate("/watchlist"),
      "escape": () => setHelpOpen(false),
    },
  });

  useEffect(() => {
    const sync = () => setShowFeedbackFab(document.body.dataset.onboardingActive !== "true");
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.body, { attributes: true, attributeFilter: ["data-onboarding-active"] });
    return () => obs.disconnect();
  }, []);

  return (
    <div style={{ fontFamily: typography.fontFamily, color: colors.textPrimary, background: colors.page, minHeight: "100vh" }}>

      {/* DESKTOP SIDEBAR */}
      <aside className="rail">
        {/* Brand */}
        <NavLink to="/" style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 16px 14px", borderBottom: `1px solid ${colors.hairline}`, textDecoration: "none", color: colors.textPrimary }}>
          <BrandMark size={28} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.2 }}>StockEx</div>
            <div style={{ fontSize: 10.5, color: colors.mute, fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase" }}>PSE Research</div>
          </div>
        </NavLink>

        {/* Market Status */}
        <div style={{ padding: "10px 12px 8px", borderBottom: `1px solid ${colors.hairline}` }}>
          <MarketStatusBadge size="sm" />
        </div>

        {/* Primary Nav */}
        <div style={{ padding: "12px 8px 8px" }}>
          <p style={sectionLabel}>Markets</p>
          <nav>
            {NAV_PRIMARY.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === "/"} className={({ isActive }) => `nav-link${isActive ? " is-active" : ""}`}>
                <item.icon size={16} strokeWidth={1.8} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Portfolio Nav */}
        <div style={{ padding: "4px 8px 8px", borderTop: `1px solid ${colors.hairline}` }}>
          <p style={sectionLabel}>My Portfolio</p>
          <nav>
            {NAV_PORTFOLIO.map((item) => (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-link${isActive ? " is-active" : ""}`}>
                <item.icon size={16} strokeWidth={1.8} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Tools */}
        <div style={{ padding: "4px 8px 8px", borderTop: `1px solid ${colors.hairline}` }}>
          <p style={sectionLabel}>Tools</p>
          <nav>
            {NAV_TOOLS.map((item) => (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-link${isActive ? " is-active" : ""}`}>
                <item.icon size={16} strokeWidth={1.8} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Footer */}
        <div style={{ marginTop: "auto", padding: `${space[4]} ${space[2]}`, borderTop: `1px solid ${colors.hairline}`, display: "flex", flexDirection: "column", gap: 4 }}>
          <ResearchProfileModal />
          <Link to="/changelog" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", borderRadius: radius.md, fontSize: 12, color: colors.mute, textDecoration: "none" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = colors.textPrimary)}
            onMouseLeave={(e) => (e.currentTarget.style.color = colors.mute)}>
            <span>What's New</span>
            <ChevronRight size={12} />
          </Link>
        </div>
      </aside>

      {/* MOBILE TOP BAR */}
      <header className="mobile-brand">
        <NavLink to="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <BrandMark size={24} />
          <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em", color: colors.textPrimary }}>StockEx</span>
        </NavLink>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <MarketStatusBadge size="sm" />
          <ResearchProfileModal />
        </div>
      </header>

      {/* MOBILE TAB BAR */}
      <nav className="tabbar" aria-label="Primary">
        {MOBILE_NAV.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === "/"} className={({ isActive }) => `tab-link${isActive ? " is-active" : ""}`}>
            <item.icon size={20} strokeWidth={1.6} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* CONTENT — opacity-only fade to avoid fixed-position children bug */}
      <main className="content">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
        <footer style={{
          marginTop: 32, paddingTop: 14,
          borderTop: `1px solid ${colors.hairline}`,
          fontSize: 11.5, color: colors.mute,
          display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8,
        }}>
          <span>© 2026 StockEx · Independent research platform, not a broker.</span>
          <Link to="/trust" style={{ color: colors.mute, textDecoration: "underline" }}>Terms & Data Sources</Link>
        </footer>
      </main>

      <KeyboardHelpOverlay open={helpOpen} onClose={() => setHelpOpen(false)} />
      {showFeedbackFab && <FloatingAiAssistant />}

      <style>{`
        /* ═══ DESKTOP SIDEBAR ═══ */
        .rail { display: none; }

        .rail .nav-link, .tab-link {
          color: ${colors.mute};
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 9px;
          transition: color 150ms ${animation.standard}, background 150ms ${animation.standard};
        }

        .rail .nav-link {
          min-height: 34px;
          justify-content: flex-start;
          border-radius: ${radius.sm};
          padding: 0 10px;
          font-size: 13px;
          font-weight: 500;
          color: ${colors.body};
          position: relative;
          margin-bottom: 1px;
        }
        .rail .nav-link svg { color: ${colors.mute}; }

        .rail .nav-link:hover {
          color: ${colors.textPrimary};
          background: ${colors.hairlineSoft};
        }
        .rail .nav-link:hover svg { color: ${colors.textPrimary}; }

        .rail .nav-link.is-active {
          color: ${colors.accentBlue};
          background: ${colors.accentBlueSoft};
          font-weight: 600;
        }
        .rail .nav-link.is-active svg { color: ${colors.accentBlue}; }
        .rail .nav-link.is-active::before {
          content: "";
          position: absolute;
          left: -8px; top: 7px; bottom: 7px;
          width: 3px;
          background: ${colors.accentBlue};
          border-radius: 0 2px 2px 0;
        }

        /* ═══ MOBILE TOP BAR ═══ */
        .mobile-brand {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: ${components.navBar.heightDesktop};
          padding: 0 16px;
          border-bottom: 1px solid ${colors.hairline};
          background: ${colors.page};
          position: sticky; top: 0; z-index: 20;
        }

        /* ═══ MOBILE TAB BAR ═══ */
        .tabbar {
          position: fixed;
          bottom: 0; left: 0; right: 0;
          height: ${components.navBar.heightMobile};
          display: grid;
          grid-template-columns: repeat(${MOBILE_NAV.length}, minmax(0, 1fr));
          border-top: 1px solid ${colors.hairline};
          background: ${colors.canvas};
          z-index: 20;
          padding-bottom: env(safe-area-inset-bottom);
        }
        .tab-link {
          flex-direction: column;
          font-size: 10px;
          font-weight: 600;
          line-height: 1.2;
          gap: 2px;
          padding: 0 4px;
          color: ${colors.mute};
          -webkit-tap-highlight-color: transparent;
        }
        .tab-link.is-active { color: ${colors.accentBlue}; }

        /* ═══ CONTENT AREA ═══ */
        .content {
          padding: 16px;
          padding-bottom: calc(${components.navBar.heightMobile} + 8px + env(safe-area-inset-bottom, 0px));
          width: 100%;
          overflow-x: hidden;
          font-variant-numeric: lining-nums tabular-nums;
          position: relative;
          z-index: 1;
        }

        @media (min-width: 768px) {
          .mobile-brand { display: none; }
          .tabbar { display: none; }
          .rail {
            display: flex;
            flex-direction: column;
            width: ${layout.sidebarWidth};
            position: fixed;
            top: 0; bottom: 0;
            border-right: 1px solid ${colors.hairline};
            background: ${colors.canvas};
            overflow-y: auto;
          }
          .content {
            margin-left: ${layout.sidebarWidth};
            padding: 24px 28px;
            max-width: calc(${layout.contentMaxWidth} + ${layout.sidebarWidth});
            padding-bottom: 40px;
          }
        }
      `}</style>
    </div>
  );
}

const sectionLabel: React.CSSProperties = {
  fontSize: "10px",
  fontWeight: 700,
  color: colors.mute,
  margin: "0 0 4px 10px",
  textTransform: "uppercase",
  letterSpacing: "0.10em",
  fontFamily: typography.fontFamily,
};
