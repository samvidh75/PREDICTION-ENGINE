import type { ReactNode } from "react";
import { GitCompare, Home, Search, Star } from "lucide-react";
import { NavLink } from "react-router-dom";
import { colors, typography, space, radius, layout, components } from "../design/tokens";

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
        color: colors.gray900,
        background: colors.white,
        minHeight: "100vh",
      }}
    >
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
              <item.icon size={18} strokeWidth={1.75} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <header className="mobile-brand">
        <NavLink to="/" style={mobileBrandLinkStyle}>
          StockStory
        </NavLink>
      </header>

      <nav className="tabbar" aria-label="Primary">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `tab-link${isActive ? " is-active" : ""}`}
          >
            <item.icon size={20} strokeWidth={1.75} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <main className="content">{children}</main>

      <style>{`
        .rail { display:none; }
        .rail .nav-link,
        .tab-link {
          color:${colors.gray600};
          text-decoration:none;
          display:flex;
          align-items:center;
          justify-content:center;
          gap:${space[2]};
        }
        .rail .nav-link {
          min-height:${components.button.heightDesktop};
          justify-content:flex-start;
          border-radius:${radius.md};
          padding:0 ${space[3]};
          font-size:${typography.body.desktop.size};
          font-weight:500;
        }
        .rail .nav-link.is-active {
          color:${colors.primary};
          background:${colors.gray50};
        }
        .mobile-brand {
          display:flex;
          align-items:center;
          height:${components.navBar.heightMobile};
          padding:0 ${layout.pagePaddingMobile};
          border-bottom:${layout.borderWidth} solid ${colors.gray100};
          background:${colors.white};
        }
        .tabbar {
          position:fixed;
          bottom:0;
          left:0;
          right:0;
          height:${components.navBar.heightMobile};
          display:flex;
          border-top:${layout.borderWidth} solid ${colors.gray100};
          background:${colors.white};
          z-index:10;
        }
        .tab-link {
          flex:1;
          flex-direction:column;
          font-size:${typography.caption.desktop.size};
          font-weight:500;
          line-height:${typography.caption.desktop.line};
        }
        .tab-link.is-active {
          color:${colors.primary};
        }
        .content {
          padding:${layout.pagePaddingMobile};
          padding-bottom:calc(${components.navBar.heightMobile} + ${space[4]});
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
            border-right:${layout.borderWidth} solid ${colors.gray100};
            padding:${space[6]};
            background:${colors.white};
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
  color: colors.gray900,
  fontSize: typography.h2.desktop.size,
  fontWeight: 600,
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
  color: colors.gray900,
  fontSize: typography.h3.desktop.size,
  fontWeight: 600,
  lineHeight: typography.h3.desktop.line,
  textDecoration: "none",
} as const;
