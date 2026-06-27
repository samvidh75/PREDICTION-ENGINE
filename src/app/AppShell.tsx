import type { ReactNode } from "react";
import { GitCompare, Home, Search, Star } from "lucide-react";
import { NavLink } from "react-router-dom";
import { colors, typography, space, radius, layout, components, shadows, animation } from "../design/tokens";

const NAV = [
  { to: "/", label: "Home", icon: Home },
  { to: "/scanner", label: "Scanner", icon: Search },
  { to: "/watchlist", label: "Watchlist", icon: Star },
  { to: "/compare", label: "Compare", icon: GitCompare },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
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
          StockStory
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
      </aside>

      {/* MOBILE TOP BAR */}
      <header className="mobile-brand">
        <NavLink to="/" style={mobileBrandLinkStyle}>
          StockStory
        </NavLink>
      </header>

      {/* MOBILE TAB BAR */}
      <nav className="tabbar" aria-label="Primary">
        {NAV.map((item) => (
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
          marginTop: "64px",
          paddingTop: "24px",
          borderTop: `1px solid ${colors.border}`,
          fontSize: "12px",
          color: colors.textSecondary,
          lineHeight: "1.6",
        }}>
          <p>
            © 2026 StockStory India. <strong>Not SEBI-registered</strong>. This service provides analysis for educational purposes only. Algorithms may contain errors. Data delayed 1-15 minutes. Consult a SEBI-registered investment advisor before investing. Past performance does not guarantee future results.
          </p>
        </footer>
      </main>

      <style>{`
        /* ===== DESKTOP SIDEBAR ===== */
        .rail { display:none; }
        .rail .nav-link,
        .tab-link {
          color:${colors.textSecondary};
          text-decoration:none;
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
          background:rgba(0,122,255,0.08);
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
          background:rgba(242,242,247,0.82);
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
          display:flex;
          border-top:${layout.borderWidth} solid ${colors.border};
          background:rgba(242,242,247,0.82);
          backdrop-filter:blur(20px);
          -webkit-backdrop-filter:blur(20px);
          z-index:10;
          padding-bottom:env(safe-area-inset-bottom);
        }
        .tab-link {
          flex:1;
          flex-direction:column;
          font-size:${typography.caption2.desktop.size};
          font-weight:500;
          line-height:${typography.caption2.desktop.line};
          gap:2px;
        }
        .tab-link.is-active {
          color:${colors.primary};
        }

        /* ===== CONTENT ===== */
        .content {
          padding:${layout.pagePaddingMobile};
          padding-bottom:calc(${components.navBar.heightMobile} + ${space[4]} + env(safe-area-inset-bottom, 0px));
          width:100%;
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
            background:rgba(242,242,247,0.78);
            backdrop-filter:blur(24px);
            -webkit-backdrop-filter:blur(24px);
            overflow-y:auto;
          }
          .tabbar { display:none; }
          .content {
            margin-left:${layout.sidebarWidth};
            padding:${layout.pagePaddingDesktop};
            padding-bottom:${layout.pagePaddingDesktop};
            max-width:${layout.contentMaxWidth};
          }
        }
      `}</style>
    </div>
  );
}

const brandLinkStyle = {
  color: colors.textPrimary,
  fontSize: typography.h2.desktop.size,
  fontWeight: 700,
  lineHeight: typography.h2.desktop.line,
  textDecoration: "none",
  marginBottom: space[8],
  display: "block",
} as const;

const navStackStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: space[1],
};

const mobileBrandLinkStyle = {
  color: colors.textPrimary,
  fontSize: typography.h3.desktop.size,
  fontWeight: 600,
  lineHeight: typography.h3.desktop.line,
  textDecoration: "none",
} as const;
