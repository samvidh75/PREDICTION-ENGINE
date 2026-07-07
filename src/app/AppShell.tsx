import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Home, Search, Star, LayoutGrid, Shield, MessageCircle, TrendingUp, ChevronDown } from "lucide-react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { colors, typography, space, radius, layout, components, shadows, animation } from "../design/tokens";
import { BrandMark } from "../components/BrandMark";
import { ResearchProfileModal } from "../components/ResearchProfileModal";
import { useKeyboardShortcuts, KeyboardHelpOverlay } from "../hooks/useKeyboardShortcuts";
import { FloatingAiAssistant } from "../components/FloatingAiAssistant";

const NAV = [
  { to: "/", label: "Home", icon: Home },
  { to: "/scanner", label: "Scanner", icon: Search },
  { to: "/sectors", label: "Sectors", icon: LayoutGrid },
  { to: "/watchlist", label: "Watchlist", icon: Star },
  { to: "/portfolio", label: "Portfolio", icon: TrendingUp },
] as const;

const MOBILE_NAV = NAV.filter((item) => item.label !== "Sectors");

const SECONDARY_NAV = [
  { to: "/relative-strength", label: "R. Strength", icon: TrendingUp },
  { to: "/chat", label: "AI Chat", icon: MessageCircle },

  { to: "/trust", label: "Trust & Safety", icon: Shield },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [helpOpen, setHelpOpen] = useState(false);
  const [showFeedbackFab, setShowFeedbackFab] = useState(() => document.body.dataset.onboardingActive !== "true");
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  useKeyboardShortcuts({
    handlers: {
      'toggle-help': () => setHelpOpen((o) => !o),
      'toggle-compare': () => navigate('/compare'),
      'toggle-track': () => navigate('/watchlist'),
      'escape': () => {
        setHelpOpen(false);
      },
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
      {/* DESKTOP SIDEBAR */}
      <aside className="rail">
        <NavLink to="/" style={brandLinkStyle}>
          <span style={brandBadgeStyle}>
            <BrandMark size={52} />
            <span style={brandWordmarkStyle}>StockEx</span>
          </span>
        </NavLink>
        <nav style={navStackStyle} aria-label="Primary">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-link${isActive ? " is-active" : ""}`}
            >
              <item.icon size={20} strokeWidth={1.75} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div style={{ marginTop: space[4], paddingTop: space[4], borderTop: `1px solid ${colors.border}` }}>
          <p style={{ fontSize: typography.caption.desktop.size, color: colors.textSecondary, margin: `0 0 ${space[2]} 0`, paddingLeft: space[3], fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Resources
          </p>
          <nav style={navStackStyle} aria-label="Resources">
            {SECONDARY_NAV.slice(0, 2).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav-link${isActive ? " is-active" : ""}`}
              >
                <item.icon size={20} strokeWidth={1.75} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* More Menu */}
          <button
            aria-label="Toggle more features menu"
            onClick={() => setMoreMenuOpen(!moreMenuOpen)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: space[2],
              padding: `${space[2]} ${space[3]}`,
              marginTop: space[2],
              borderRadius: `${radius.md}`,
              border: 'none',
              background: moreMenuOpen ? `rgba(255,255,255,0.08)` : 'transparent',
              color: colors.textSecondary,
              fontSize: typography.body.desktop.size,
              fontWeight: 500,
              cursor: 'pointer',
              transition: `all ${animation.standard}`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `rgba(255,255,255,0.08)`;
              e.currentTarget.style.color = colors.textPrimary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = moreMenuOpen ? `rgba(255,255,255,0.08)` : 'transparent';
              e.currentTarget.style.color = colors.textSecondary;
            }}
          >
            <span>More Features</span>
            <ChevronDown size={16} style={{ transform: moreMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: `transform ${animation.standard}` }} />
          </button>

          {/* More Menu Items */}
          {moreMenuOpen && (
            <nav style={{ ...navStackStyle, marginTop: space[2] }} aria-label="More">
              {SECONDARY_NAV.slice(2).map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `nav-link${isActive ? " is-active" : ""}`}
                  onClick={() => setMoreMenuOpen(false)}
                >
                  <item.icon size={20} strokeWidth={1.75} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
          )}
        </div>
        <div style={{
          marginTop: "auto",
          display: "flex",
          flexDirection: "column",
          gap: space[3],
          paddingTop: space[4],
          borderTop: `1px solid ${colors.border}`,
        }}>
          <Link to="/changelog" className="nav-link" style={{ gap: space[2] }}>
            <span>What's New</span>
          </Link>
          <NavLink
            to="/watchlist"
            className={({ isActive }) => `nav-link${isActive ? " is-active" : ""}`}
            style={{ gap: space[2] }}
          >
            <span>Alerts</span>
          </NavLink>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <ResearchProfileModal />
          </div>
        </div>
      </aside>

      {/* MOBILE TOP BAR */}
      <header className="mobile-brand" style={{ justifyContent: "space-between" }}>
        <NavLink to="/" style={mobileBrandLinkStyle}>
          <span style={mobileBrandBadgeStyle}>
            <BrandMark size={40} />
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
            <item.icon size={22} strokeWidth={1.5} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* CONTENT */}
      <main className="content">
        {children}
        <footer style={{
          marginTop: "20px",
          paddingTop: "8px",
          borderTop: `1px solid ${colors.border}`,
          fontSize: "8px",
          color: colors.textSecondary,
          lineHeight: "1.35",
        }}>
          <p style={{ margin: 0 }}>
            © 2026 StockEx. <strong>Not PSE-listed.</strong>{" "}
            <Link to="/trust" style={{ color: colors.textSecondary, textDecoration: "none" }}>
              Terms and conditions
            </Link>
          </p>
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
          color:${colors.textSecondary};
          text-decoration:none;
          text-decoration-line:none;
          display:flex;
          align-items:center;
          justify-content:center;
          gap:${space[2]};
          transition:color ${animation.standard};
        }
        .rail .nav-link {
          min-height:${components.button.heightDesktop};
          justify-content:flex-start;
          border-radius:${radius.md};
          padding:0 ${space[3]};
          font-size:${typography.body.desktop.size};
          font-weight:500;
          color:${colors.textSecondary};
        }
        .rail .nav-link.is-active {
          color:${colors.primary};
          background:${colors.hairlineStrong};
        }
        .rail .nav-link:hover {
          color:${colors.textPrimary};
        }

        /* ===== MOBILE BRAND BAR ===== */
        .mobile-brand {
          display:flex;
          align-items:center;
          height:${components.navBar.heightDesktop};
          padding:0 ${layout.pagePaddingMobile};
          border-bottom:${layout.borderWidth} solid ${colors.border};
          background:${colors.backdropGlassmorphic};
          backdrop-filter:blur(20px);
          -webkit-backdrop-filter:blur(20px);
        }

        /* ===== MOBILE TAB BAR ===== */
        .tabbar {
          position:fixed;
          bottom:0;
          left:0;
          right:0;
          height:${components.navBar.heightMobile};
          display:grid;
          grid-template-columns:repeat(${MOBILE_NAV.length}, minmax(0, 1fr));
          border-top:${layout.borderWidth} solid ${colors.border};
          background:${colors.backdropGlassmorphic};
          backdrop-filter:blur(20px);
          -webkit-backdrop-filter:blur(20px);
          z-index:10;
          padding-bottom:env(safe-area-inset-bottom);
        }
        .tab-link {
          flex-direction:column;
          font-size:${typography.caption.desktop.size};
          font-weight:500;
          line-height:${typography.caption.desktop.line};
          gap:2px;
          min-width:0;
          padding:0 ${space[1]};
          text-decoration:none;
          text-decoration-line:none;
          -webkit-tap-highlight-color:transparent;
        }
        .tab-link.is-active {
          color:${colors.primary};
        }
        .tab-link:hover,
        .tab-link:focus,
        .tab-link:focus-visible,
        .tab-link:active {
          text-decoration:none;
        }

        /* ===== CONTENT ===== */
        .content {
          padding:${layout.pagePaddingMobile};
          padding-bottom:calc(${components.navBar.heightMobile} + 6px + env(safe-area-inset-bottom, 0px));
          width:100%;
          overflow-x:hidden;
        }

        @media (min-width:768px) {
          .mobile-brand { display:none; }
          .rail {
            display:flex;
            flex-direction:column;
            width:${layout.sidebarWidth};
            position:fixed;
            top:0;
            bottom:0;
            border-right:${layout.borderWidth} solid ${colors.border};
            padding:${space[6]};
            background:${colors.backdropGlassmorphic};
            backdrop-filter:blur(24px);
            -webkit-backdrop-filter:blur(24px);
            overflow-y:auto;
          }
          .tabbar { display:none; }
          .content {
            margin-left:${layout.sidebarWidth};
            width:auto;
            padding:${layout.pagePaddingDesktop};
            padding-bottom:${layout.pagePaddingDesktop};
            max-width:${layout.contentMaxWidth};
            overflow-x:hidden;
          }
        }
        /* ===== FEEDBACK FAB ANIMATION ===== */
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

const brandLinkStyle = {
  color: colors.textPrimary,
  textDecoration: "none",
  marginBottom: space[8],
  display: "inline-flex",
  alignItems: "center",
} as const;

const brandBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: space[3],
  padding: `${space[2]} ${space[3]}`,
  borderRadius: radius.xl,
  border: `1px solid ${colors.hairline}`,
  background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
  boxShadow: shadows.elevated,
} as const;

const brandWordmarkStyle = {
  fontSize: "18px",
  fontWeight: 750,
  letterSpacing: "-0.03em",
  lineHeight: 1,
  color: colors.textPrimary,
} as const;

const navStackStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: space[1],
};

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
  borderRadius: radius.lg,
  border: `1px solid ${colors.hairline}`,
  background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
} as const;

const mobileBrandWordmarkStyle = {
  fontSize: "16px",
  fontWeight: 750,
  letterSpacing: "-0.03em",
  lineHeight: 1,
  color: colors.textPrimary,
} as const;
