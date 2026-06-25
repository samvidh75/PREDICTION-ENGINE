import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import Logo from "../brand/Logo";
import { useAuth } from "../../context/AuthContext";
import NavLink from "../../shared/ui/NavLink";

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return mobile;
}

const NAV_ITEMS = [
  { href: "/",          label: "Home",     icon: "\u2302" },
  { href: "/scanner",   label: "Scanner",  icon: "\u2695" },
  { href: "/watchlist", label: "Watchlist", icon: "\u2661" },
  { href: "/compare",   label: "Compare",  icon: "\u2295" },
];

const AUTH_ROUTES = ["/login", "/register", "/forgot-password"];

export default function AppShell({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();
  const { user, logout } = useAuth();
  const location = useLocation();
  const active = location.pathname === "/" ? "home" : location.pathname.replace(/^\//, "").split("/")[0];

  if (AUTH_ROUTES.includes(location.pathname)) {
    return <>{children}</>;
  }

  const sidebarNavLink = (href: string, label: string, icon: string) => {
    const isActive = href === "/" ? active === "home" : active.startsWith(href.replace("/", ""));
    return (
      <NavLink
        key={href}
        href={href}
        style={{
          display: "flex", alignItems: "center", gap: 10, width: "100%",
          padding: "10px 20px",
          fontSize: 14, fontWeight: isActive ? 600 : 500,
          color: isActive ? "var(--brand)" : "var(--text-500)",
          borderLeft: isActive ? "3px solid var(--brand)" : "3px solid transparent",
          background: isActive ? "var(--brand-tint)" : "transparent",
          textDecoration: "none", lineHeight: 1,
          transition: "all var(--t-instant)",
        }}
      >
        <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>{icon}</span>
        {label}
      </NavLink>
    );
  };

  const bottomNavLink = (href: string, label: string, icon: string) => {
    const isActive = href === "/" ? active === "home" : active === href.replace("/", "");
    return (
      <NavLink
        key={href}
        href={href}
        style={{
          flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", gap: 2, height: 44, minWidth: 48,
          color: isActive ? "var(--brand)" : "var(--text-300)",
          textDecoration: "none", fontSize: 10, fontWeight: 600,
        }}
      >
        <span style={{ fontSize: 20 }}>{icon}</span>
        <span>{label}</span>
      </NavLink>
    );
  };

  if (isMobile) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--page)", paddingBottom: "76px" }}>
        <div style={{ padding: "16px 16px 0" }}>
          {children}
        </div>
        <nav style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 200,
          height: 60, background: "var(--surface)",
          borderTop: "1px solid var(--border)",
          display: "flex", alignItems: "stretch",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}>
          {NAV_ITEMS.map(item => bottomNavLink(item.href, item.label, item.icon))}
        </nav>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--page)" }}>
      <aside style={{
        width: 220, flexShrink: 0, background: "var(--surface)",
        borderRight: "1px solid var(--border)",
        display: "flex", flexDirection: "column", height: "100vh",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ padding: "20px 12px" }}>
          <Logo />
        </div>

        <nav style={{ flex: 1, padding: "8px 0" }}>
          {NAV_ITEMS.map(item => sidebarNavLink(item.href, item.label, item.icon))}
        </nav>

        <div style={{ padding: "12px", borderTop: "1px solid var(--border)" }}>
          {user ? (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: "50%",
                  background: "var(--brand-tint)", display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: 12, fontWeight: 700, color: "var(--brand)",
                }}>
                  {user.displayName?.slice(0, 2).toUpperCase() || user.email?.slice(0, 2).toUpperCase() || "S"}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-900)" }}>
                    {user.displayName || user.email}
                  </div>
                </div>
              </div>
              <button onClick={logout} style={{
                fontSize: 12, color: "var(--text-300)",
                background: "none", border: "none", cursor: "pointer", padding: 0,
              }}>
                Sign out
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <NavLink href="/login" style={{ fontSize: 13, fontWeight: 600, color: "var(--brand)", textDecoration: "none" }}>Sign in \u2192</NavLink>
              <NavLink href="/register" style={{ fontSize: 12, color: "var(--text-500)", textDecoration: "none" }}>Create account</NavLink>
            </div>
          )}
        </div>

        <div style={{
          fontSize: 10, color: "var(--text-300)", lineHeight: 1.5,
          padding: "12px", textAlign: "center",
        }}>
          Not SEBI-registered<br />
          Not investment advice<br />
          \u00A9 2025 StockStory India
        </div>
      </aside>

      <main style={{ flex: 1, minWidth: 0, padding: "32px 40px", background: "var(--page)" }}>
        {children}
      </main>
    </div>
  );
}
