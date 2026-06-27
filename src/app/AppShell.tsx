import type { ReactNode } from "react";
import { GitCompare, Home, Search, Star } from "lucide-react";
import { NavLink } from "react-router-dom";

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
        fontFamily: "var(--font)",
        color: "var(--text-700)",
        background: "var(--page)",
        minHeight: "100vh",
      }}
    >
      <aside className="rail">
        <NavLink to="/" className="brand-link">
          StockStory
        </NavLink>
        <nav className="nav-stack" aria-label="Primary">
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
        <NavLink to="/" className="mobile-brand-link">
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
        .mobile-brand {
          display:flex;
          align-items:center;
          height:56px;
          padding:0 16px;
          border-bottom:1px solid var(--border);
          background:var(--page);
        }
        .mobile-brand-link {
          color:var(--text-primary);
          font-size:18px;
          font-weight:600;
          line-height:1.3;
          text-decoration:none;
        }
        .tabbar {
          position:fixed;
          bottom:0;
          left:0;
          right:0;
          height:56px;
          display:flex;
          border-top:1px solid var(--border);
          background:var(--page);
          z-index:10;
        }
        .content {
          padding:16px;
          padding-bottom:72px;
          width:100%;
        }
        .brand-link {
          color:var(--text-primary);
          font-size:20px;
          font-weight:600;
          line-height:1.3;
          text-decoration:none;
          margin-bottom:32px;
        }
        .nav-stack {
          display:flex;
          flex-direction:column;
          gap:4px;
        }
        .nav-link,
        .tab-link {
          color:var(--text-500);
          text-decoration:none;
          display:flex;
          align-items:center;
          justify-content:center;
          gap:8px;
        }
        .nav-link {
          min-height:44px;
          justify-content:flex-start;
          border-radius:6px;
          padding:0 12px;
        }
        .tab-link {
          flex:1;
          flex-direction:column;
          font-size:12px;
          font-weight:500;
          line-height:1.4;
        }
        .nav-link.is-active,
        .tab-link.is-active {
          color:var(--brand);
          background:var(--chip);
        }
        @media (min-width:768px) {
          .mobile-brand { display:none; }
          .rail {
            display:flex;
            flex-direction:column;
            width:240px;
            position:fixed;
            top:0;
            bottom:0;
            border-right:1px solid var(--border);
            padding:24px;
            background:var(--page);
          }
          .tabbar { display:none; }
          .content {
            margin-left:240px;
            padding:48px;
            padding-bottom:48px;
            max-width:1120px;
          }
        }
      `}</style>
    </div>
  );
}
