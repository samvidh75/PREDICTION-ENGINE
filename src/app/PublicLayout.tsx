import { useState } from "react";
import { useNavigate, useLocation, NavLink } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Menu, X, Home as HomeIcon, Search, LayoutGrid,
  Star, TrendingUp, MessageCircle, Shield, DollarSign, ArrowRight,
} from "lucide-react";
import { BrandMark } from "../components/BrandMark";

/* ============================================================================
   PublicLayout — Editorial chrome for the open site (home, scanner, stock, etc.)

   Masthead-style: paper canvas, hairline rules, fox-orange accents.
   ============================================================================ */

type NavEntry = { to: string; label: string; icon: typeof HomeIcon };

const PRIMARY_NAV: NavEntry[] = [
  { to: "/",            label: "Home",       icon: HomeIcon },
  { to: "/scanner",     label: "Scanner",    icon: Search },
  { to: "/sectors",     label: "Sectors",    icon: LayoutGrid },
  { to: "/watchlist",   label: "Watchlist",  icon: Star },
  { to: "/portfolio",   label: "Portfolio",  icon: TrendingUp },
];

const SECONDARY_NAV: NavEntry[] = [
  { to: "/pricing",     label: "Pricing",    icon: DollarSign },
  { to: "/trust",       label: "Trust",      icon: Shield },
  { to: "/chat",        label: "AI Chat",    icon: MessageCircle },
];

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div
      style={{
        background: "var(--bg-page)",
        color: "var(--text-primary)",
        fontFamily: "var(--font-sans)",
        minHeight: "100vh",
        display: "flex",
        fontVariantNumeric: "lining-nums",
      }}
    >
      {/* Quiet ambient glow, shared across every page — texture, not a focal point */}
      <div className="stockex-ambient-field" aria-hidden="true">
        <div className="stockex-ambient-glow" />
        <div className="stockex-ambient-glow-secondary" />
      </div>

      {/* ── Sidebar (drawer-style on all sizes; opens from menu button) ── */}
      <aside
        style={{
          width: sidebarOpen ? "260px" : "0",
          background: "var(--bg-page)",
          borderRight: sidebarOpen ? "1px solid var(--border)" : "1px solid transparent",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          padding: sidebarOpen ? "24px 0" : "0",
          transition: "width 320ms cubic-bezier(0.4,0,0.2,1), padding 320ms cubic-bezier(0.4,0,0.2,1), border-color 320ms ease",
          overflow: "hidden",
          position: "fixed",
          left: 0,
          top: 0,
          height: "100vh",
          zIndex: 100,
        }}
      >
        <div
          style={{
            padding: "0 22px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <button
            type="button"
            onClick={() => { navigate("/"); closeSidebar(); }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "transparent",
              border: "none",
              padding: 0,
              cursor: "pointer",
              color: "var(--text-primary)",
            }}
          >
            <BrandMark size={36} />
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 500,
                fontStyle: "italic",
                fontSize: 18,
                letterSpacing: "-0.015em",
                color: "var(--text-primary)",
                whiteSpace: "nowrap",
              }}
            >
              StockEx
            </span>
          </button>
          <button
            type="button"
            onClick={closeSidebar}
            aria-label="Close menu"
            style={{
              background: "transparent",
              border: "1px solid transparent",
              color: "var(--text-body)",
              cursor: "pointer",
              padding: 6,
              borderRadius: 6,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "color 180ms var(--ease-soft), border-color 180ms var(--ease-soft), background 180ms var(--ease-soft)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-primary)"; e.currentTarget.style.borderColor = "var(--border)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-body)"; e.currentTarget.style.borderColor = "transparent"; }}
          >
            <X size={16} />
          </button>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", flex: 1, padding: "0 8px" }}>
          <SectionLabel>Read & research</SectionLabel>
          {PRIMARY_NAV.map((link) => (
            <SidebarLink key={link.to} link={link} />
          ))}
          <SectionLabel top>Account</SectionLabel>
          {SECONDARY_NAV.map((link) => (
            <SidebarLink key={link.to} link={link} />
          ))}
        </nav>

        <div
          style={{
            padding: "14px 22px",
            borderTop: "1px solid var(--border)",
            color: "var(--text-secondary)",
            fontSize: 11,
            lineHeight: 1.55,
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.04em",
          }}
        >
          © 2026 StockEx — Independent research, not investment advice.
        </div>
      </aside>

      {/* ── Sidebar backdrop ─────────────────────────────────────── */}
      {sidebarOpen && (
        <div
          onClick={closeSidebar}
          aria-hidden="true"
          role="presentation"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(14,17,22,0.32)",
            zIndex: 90,
            transition: "opacity 220ms var(--ease-soft)",
          }}
        />
      )}

      {/* ── Body column ─────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Masthead bar */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 28px",
            borderBottom: "1px solid var(--glass-border)",
            boxShadow: "inset 0 1px 0 var(--glass-border-top)",
            position: "sticky",
            top: 0,
            zIndex: 80,
            background: "var(--glass-bg)",
            backdropFilter: "blur(var(--glass-blur)) saturate(160%)",
            WebkitBackdropFilter: "blur(var(--glass-blur)) saturate(160%)",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
            <button
              type="button"
              aria-label={sidebarOpen ? "Hide menu" : "Open menu"}
              onClick={() => setSidebarOpen((s) => !s)}
              style={{
                background: "transparent",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
                cursor: "pointer",
                height: 34,
                padding: "0 12px",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                borderRadius: 4,
                fontSize: 13,
                fontWeight: 500,
                fontFamily: "var(--font-sans)",
                transition: "all 180ms var(--ease-soft)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-primary)"; }}
            >
              {sidebarOpen ? <X size={14} /> : <Menu size={14} />}
              <span style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.04em", textTransform: "uppercase", fontSize: 11 }}>
                {sidebarOpen ? "Close" : "Menu"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => navigate("/")}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                background: "transparent", border: "none", padding: 0, cursor: "pointer",
                color: "var(--text-primary)",
              }}
            >
              <BrandMark size={32} />
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 500,
                  fontStyle: "italic",
                  fontSize: 19,
                  letterSpacing: "-0.015em",
                }}
              >
                StockEx
              </span>
            </button>
          </div>

          <nav
            aria-label="Primary"
            className="public-top-nav"
            style={{
              display: "none",
              gap: 4,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            {PRIMARY_NAV.slice(1).map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                style={({ isActive }) => ({
                  padding: "7px 12px",
                  fontSize: 13,
                  fontWeight: 500,
                  color: isActive ? "var(--text-primary)" : "var(--text-body)",
                  textDecoration: "none",
                  borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent",
                  marginBottom: -2,
                  transition: "color 180ms var(--ease-soft), border-color 180ms var(--ease-soft)",
                })}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              onClick={() => navigate("/scanner")}
              style={{
                background: "var(--brand)", color: "var(--text-inverse)",
                border: "1px solid var(--brand)",
                borderRadius: 4,
                padding: "0 14px",
                height: 34,
                fontFamily: "var(--font-sans)",
                fontSize: 12.5,
                fontWeight: 500,
                letterSpacing: "0.01em",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                transition: "background 180ms var(--ease-soft)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--brand-light)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "var(--brand)"; }}
            >
              Open scanner <ArrowRight size={13} />
            </button>
          </div>
        </header>

        <style>{`
          .public-top-nav { display: none; }
          @media (min-width: 980px) {
            .public-top-nav { display: flex !important; }
          }
          @media (max-width: 640px) {
            header[role="masthead"], header { padding-left: 16px !important; padding-right: 16px !important; }
          }
        `}</style>

        <main style={{ flex: 1, overflow: "auto", paddingBottom: 24, position: "relative", zIndex: 1 }}>
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
        </main>

        <footer
          style={{
            padding: "22px 28px",
            borderTop: "1px solid var(--border)",
            color: "var(--text-secondary)",
            fontSize: 12,
            display: "flex",
            flexDirection: "column",
            gap: 6,
            position: "relative",
            zIndex: 1,
            background: "var(--bg-page)",
          }}
        >
          <span>
            <strong style={{ color: "var(--text-primary)" }}>StockEx</strong> · Independent research, not financial advice.
          </span>
          <span style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}>
            Citations: PSE public filings and issuer disclosures. Estimates are the author's; no tip is implied.
          </span>
        </footer>
      </div>
    </div>
  );
}

function SectionLabel({ children, top }: { children: React.ReactNode; top?: boolean }) {
  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 10.5,
        letterSpacing: "0.10em",
        textTransform: "uppercase",
        color: "var(--accent)",
        fontWeight: 600,
        padding: top ? "16px 14px 8px" : "0 14px 8px",
      }}
    >
      {children}
    </span>
  );
}

function SidebarLink({ link }: { link: NavEntry }) {
  return (
    <NavLink
      to={link.to}
      onClick={() => {
        // drawer-style sidebar: close on link tap on every viewport
        const ev = (typeof window !== "undefined") ? window.innerWidth : 1280;
        if (ev < 1280) {
          // keep drawer open on desktop; close on mobile handled in CSS already
        }
      }}
      style={({ isActive }) => ({
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "9px 14px",
        fontSize: 13.5,
        fontWeight: 500,
        color: isActive ? "var(--text-primary)" : "var(--text-body)",
        background: isActive ? "var(--bg-card)" : "transparent",
        textDecoration: "none",
        borderRadius: 6,
        transition: "background 180ms var(--ease-soft), color 180ms var(--ease-soft)",
        position: "relative",
      })}
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                left: 4, top: 12, bottom: 12,
                width: 2,
                background: "var(--accent)",
                borderRadius: 1,
              }}
            />
          )}
          <link.icon size={15} strokeWidth={1.6} />
          <span>{link.label}</span>
        </>
      )}
    </NavLink>
  );
}
