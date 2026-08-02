import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Home as HomeIcon, Search as SearchIcon, Star, LayoutGrid, Shield, MessageCircle, TrendingUp, ChevronDown } from "lucide-react";
import { NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { colors, typography, space, radius, layout, components, shadows, animation } from "../design/tokens";
import { BrandMark } from "../components/BrandMark";
import { ResearchProfileModal } from "../components/ResearchProfileModal";
import { useKeyboardShortcuts, KeyboardHelpOverlay } from "../hooks/useKeyboardShortcuts";
import { FloatingAiAssistant } from "../components/FloatingAiAssistant";

/* ============================================================================
   AppShell — Editorial masthead chrome for the authenticated workspace.

   Paper canvas, hairline rules, fox-orange accent, no glassmorphism.
   ============================================================================ */

const NAV = [
  { to: "/",           label: "Home",       icon: HomeIcon },
  { to: "/scanner",    label: "Scanner",    icon: SearchIcon },
  { to: "/sectors",    label: "Sectors",    icon: LayoutGrid },
  { to: "/watchlist",  label: "Watchlist",  icon: Star },
  { to: "/portfolio",  label: "Portfolio",  icon: TrendingUp },
] as const;

const MOBILE_NAV = NAV;

const SECONDARY_NAV = [
  { to: "/chat",  label: "AI Chat",  icon: MessageCircle },
  { to: "/trust", label: "Trust",    icon: Shield },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [helpOpen, setHelpOpen] = useState(false);
  const [showFeedbackFab, setShowFeedbackFab] = useState(() => document.body.dataset.onboardingActive !== "true");
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  useKeyboardShortcuts({
    handlers: {
      'toggle-help': () => setHelpOpen((o) => !o),
      'toggle-compare': () => navigate('/compare'),
      'toggle-track': () => navigate('/watchlist'),
      'escape': () => { setHelpOpen(false); },
    },
  });

  useEffect(() => {
    const syncFeedbackFab = () => {
      setShowFeedbackFab(document.body.dataset.onboardingActive !== "true");
    };
    syncFeedbackFab();
    const observer = new MutationObserver(syncFeedbackFab);
    observer.observe(document.body, { attributes: true, attributeFilter: ["data-onboarding-active"] });
    return () => observer.disconnect();
  }, []);

  return (
    <div
      style={{
        fontFamily: typography.fontFamily,
        color: colors.textPrimary,
        background: colors.page,
        minHeight: "100vh",
      }}
    >
      {/* Quiet ambient glow, shared across every workspace page */}
      <div className="stockex-ambient-field" aria-hidden="true">
        <div className="stockex-ambient-glow" />
        <div className="stockex-ambient-glow-secondary" />
      </div>

      {/* DESKTOP SIDEBAR */}
      <aside className="rail">
        <NavLink to="/" style={brandLinkStyle}>
          <span style={brandBadgeStyle}>
            <BrandMark size={44} />
            <span style={brandWordmarkStyle}>StockEx</span>
          </span>
        </NavLink>

        <div style={{ padding: `0 ${space[3]} ${space[3]}`, borderBottom: `1px solid ${colors.hairline}` }}>
          <p style={sectionLabelStyle}>Read & research</p>
          <nav style={navStackStyle} aria-label="Primary">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav-link${isActive ? " is-active" : ""}`}
              >
                <item.icon size={18} strokeWidth={1.6} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div style={{ padding: `${space[4]} ${space[3]} ${space[2]}` }}>
          <p style={sectionLabelStyle}>Tools</p>
          <nav style={navStackStyle} aria-label="Tools">
            {SECONDARY_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav-link${isActive ? " is-active" : ""}`}
              >
                <item.icon size={18} strokeWidth={1.6} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div style={footerBlockStyle}>
          <Link to="/changelog" className="nav-link" style={footerLinkStyle}>
            <span>What's New</span>
          </Link>
          <NavLink
            to="/watchlist"
            className={({ isActive }) => `nav-link${isActive ? " is-active" : ""}`}
            style={footerLinkStyle}
          >
            <span>Alerts</span>
          </NavLink>
          <div style={{ display: "flex", justifyContent: "center", paddingTop: space[2] }}>
            <ResearchProfileModal />
          </div>
        </div>
      </aside>

      {/* MOBILE TOP BAR */}
      <header className="mobile-brand">
        <NavLink to="/" style={mobileBrandLinkStyle}>
          <span style={mobileBrandBadgeStyle}>
            <BrandMark size={32} />
            <span style={mobileBrandWordmarkStyle}>StockEx</span>
          </span>
        </NavLink>
        <div style={{ display: "flex", alignItems: "center", gap: space[3] }}>
          <ResearchProfileModal />
        </div>
      </header>

      {/* MOBILE TAB BAR */}
      <nav className="tabbar" aria-label="Primary">
        {MOBILE_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `tab-link${isActive ? " is-active" : ""}`}
          >
            <item.icon size={20} strokeWidth={1.5} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* CONTENT */}
      <main className="content">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
        <footer style={{
          marginTop: "32px",
          paddingTop: "16px",
          borderTop: `1px solid ${colors.hairline}`,
          fontSize: "11px",
          color: colors.textSecondary,
          lineHeight: "1.5",
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "8px",
        }}>
          <span>
            © 2026 StockEx · Independent research, not financial advice.
          </span>
          <Link to="/trust" style={{ color: colors.textSecondary, textDecoration: "none" }}>
            Terms and conditions
          </Link>
        </footer>
      </main>

      {/* KEYBOARD HELP */}
      <KeyboardHelpOverlay open={helpOpen} onClose={() => setHelpOpen(false)} />

      {showFeedbackFab && <FloatingAiAssistant />}

      <style>{`
        /* ===== DESKTOP SIDEBAR ===== */
        .rail { display:none; }
        .rail .nav-link,
        .tab-link {
          color: ${colors.textSecondary};
          text-decoration: none;
          text-decoration-line: none;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: color 200ms ${animation.standard}, background 200ms ${animation.standard};
        }
        .rail .nav-link {
          min-height: 36px;
          justify-content: flex-start;
          border-radius: ${radius.md};
          padding: 0 ${space[3]};
          font-size: 13px;
          font-weight: 500;
          color: ${colors.body};
          position: relative;
        }
        .rail .nav-link .icon-box,
        .rail .nav-link svg { color: ${colors.textSecondary}; }
        .rail .nav-link.is-active {
          color: ${colors.textPrimary};
          background: ${colors.hairlineSoft};
        }
        .rail .nav-link.is-active::before {
          content: "";
          position: absolute;
          left: -8px; top: 8px; bottom: 8px;
          width: 2px;
          background: ${colors.accentRed};
          border-radius: 1px;
        }
        .rail .nav-link:hover {
          color: ${colors.textPrimary};
          background: ${colors.hairlineSoft};
        }
        .rail .nav-link:hover svg { color: ${colors.textPrimary}; }

        /* ===== MOBILE BRAND BAR ===== */
        .mobile-brand {
          display:flex;
          align-items:center;
          height:${components.navBar.heightDesktop};
          padding: 0 16px;
          border-bottom: 2px solid ${colors.textPrimary};
          background: ${colors.page};
          position: sticky; top: 0; z-index: 20;
        }

        /* ===== MOBILE TAB BAR ===== */
        .tabbar {
          position:fixed;
          bottom:0; left:0; right:0;
          height:${components.navBar.heightMobile};
          display:grid;
          grid-template-columns: repeat(${MOBILE_NAV.length}, minmax(0, 1fr));
          border-top: 1px solid ${colors.hairline};
          background: ${colors.page};
          z-index: 20;
          padding-bottom: env(safe-area-inset-bottom);
        }
        .tab-link {
          flex-direction: column;
          font-size: 10px;
          font-weight: 600;
          line-height: 1.3;
          letter-spacing: 0.02em;
          gap: 2px;
          min-width: 0;
          padding: 0 4px;
          text-decoration: none;
          text-decoration-line: none;
          -webkit-tap-highlight-color: transparent;
          color: ${colors.textSecondary};
        }
        .tab-link.is-active {
          color: ${colors.accentRed};
        }
        .tab-link:hover, .tab-link:focus,
        .tab-link:focus-visible, .tab-link:active {
          text-decoration: none;
        }

        /* ===== CONTENT ===== */
        .content {
          padding: 16px;
          padding-bottom: calc(${components.navBar.heightMobile} + 6px + env(safe-area-inset-bottom, 0px));
          width: 100%;
          overflow-x: hidden;
          font-variant-numeric: lining-nums;
          position: relative;
          z-index: 1;
        }

        @media (min-width: 768px) {
          .mobile-brand { display:none; }
          .rail {
            display:flex;
            flex-direction:column;
            width:${layout.sidebarWidth};
            position:fixed;
            top:0; bottom:0;
            border-right: 1px solid ${colors.hairline};
            padding: 16px 0;
            background: ${colors.page};
            overflow-y:auto;
          }
          .tabbar { display:none; }
          .content {
            margin-left:${layout.sidebarWidth};
            width:auto;
            padding: ${layout.pagePaddingDesktop};
            padding-bottom: ${layout.pagePaddingDesktop};
            max-width: ${layout.contentMaxWidth};
            overflow-x:hidden;
          }
        }
      `}</style>
    </div>
  );
}

const brandLinkStyle = {
  color: colors.textPrimary,
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  padding: `0 ${space[3]} ${space[4]}`,
  borderBottom: `2px solid ${colors.textPrimary}`,
} as const;

const brandBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: space[3],
  padding: `${space[2]} 0`,
} as const;

const brandWordmarkStyle = {
  fontFamily: '"Fraunces", "Source Serif Pro", Georgia, serif',
  fontSize: "18px",
  fontWeight: 500,
  fontStyle: "italic",
  letterSpacing: "-0.015em",
  lineHeight: 1,
  color: colors.textPrimary,
} as const;

const navStackStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 2,
};

const sectionLabelStyle = {
  fontSize: "10.5px",
  fontWeight: 600,
  color: colors.accentRed,
  margin: `0 0 ${space[2]} 0`,
  paddingLeft: space[3],
  textTransform: "uppercase" as const,
  letterSpacing: "0.10em",
  fontFamily: typography.fontFamily,
};

const footerBlockStyle = {
  marginTop: "auto",
  display: "flex",
  flexDirection: "column" as const,
  gap: 4,
  paddingTop: space[4],
  borderTop: `1px solid ${colors.hairline}`,
  padding: `${space[4]} ${space[3]} ${space[2]}`,
};

const footerLinkStyle = {
  display: "flex",
  alignItems: "center",
  gap: space[2],
  fontSize: 13,
  fontWeight: 500,
  color: colors.body,
  textDecoration: "none",
  padding: `${space[2]} ${space[3]}`,
  borderRadius: radius.md,
} as const;

const mobileBrandLinkStyle = {
  color: colors.textPrimary,
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
} as const;

const mobileBrandBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: space[2],
  padding: `${space[1]} ${space[2]}`,
} as const;

const mobileBrandWordmarkStyle = {
  fontFamily: '"Fraunces", "Source Serif Pro", Georgia, serif',
  fontSize: "17px",
  fontWeight: 500,
  fontStyle: "italic",
  letterSpacing: "-0.015em",
  lineHeight: 1,
  color: colors.textPrimary,
} as const;
