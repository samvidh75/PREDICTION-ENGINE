import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Home, Search, Star, CreditCard, LayoutGrid, BookOpen, Shield, MessageSquareText, ArrowUpRight, MessageCircle, TrendingUp } from "lucide-react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { colors, typography, space, radius, layout, components, shadows, animation } from "../design/tokens";
import { NotificationBell } from "../components/NotificationBell";
import { ResearchProfileModal } from "../components/ResearchProfileModal";
import BetaBadge from "../components/BetaBadge";
import PrivacyConsentBanner from "../components/PrivacyConsentBanner";
import { CommandPalette } from "../components/CommandPalette";
import { useKeyboardShortcuts, KeyboardHelpOverlay } from "../hooks/useKeyboardShortcuts";
import { SCAN_PRESETS } from "../services/scanner/presets";

const NAV = [
  { to: "/", label: "Home", icon: Home },
  { to: "/scanner", label: "Scanner", icon: Search },
  { to: "/sectors", label: "Sectors", icon: LayoutGrid },
  { to: "/watchlist", label: "Watchlist", icon: Star },
  { to: "/pricing", label: "Pricing", icon: CreditCard },
] as const;

const SECONDARY_NAV = [
  { to: "/relative-strength", label: "R. Strength", icon: TrendingUp },
  { to: "/chat", label: "AI Chat", icon: MessageCircle },
  { to: "/methodology", label: "Methodology", icon: BookOpen },
  { to: "/trust", label: "Trust & Safety", icon: Shield },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  // Cmd+K / Ctrl+K to open palette
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useKeyboardShortcuts({
    handlers: {
      'toggle-help': () => setHelpOpen((o) => !o),
      'toggle-compare': () => navigate('/compare'),
      'toggle-track': () => navigate('/watchlist'),
      'escape': () => {
        setHelpOpen(false);
        setPaletteOpen(false);
      },
    },
  });

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
          StockStory<BetaBadge />
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
            {SECONDARY_NAV.map((item) => (
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
            <ArrowUpRight size={20} strokeWidth={1.75} />
            <span>What's New</span>
          </Link>
          <NavLink
            to="/watchlist"
            className={({ isActive }) => `nav-link${isActive ? " is-active" : ""}`}
            style={{ gap: space[2] }}
          >
            <NotificationBell />
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
          StockStory<BetaBadge />
        </NavLink>
        <div style={{ display: "flex", alignItems: "center", gap: space[3] }}>
          <Link to="/changelog" style={{ color: colors.textSecondary, display: "flex" }}>
            <ArrowUpRight size={20} strokeWidth={1.75} />
          </Link>
          <NotificationBell />
          <ResearchProfileModal />
        </div>
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

      {/* COMMAND PALETTE */}
      <CommandPalette
        presets={SCAN_PRESETS.map((p) => ({
          id: p.id,
          label: p.label,
          description: p.description,
          icon: p.icon,
        }))}
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
      />

      {/* KEYBOARD HELP */}
      <KeyboardHelpOverlay open={helpOpen} onClose={() => setHelpOpen(false)} />

      {/* FEEDBACK FAB — Raycast-inspired */}
      <button
        id="feedback-fab"
        onClick={() => {
          const existing = document.getElementById("feedback-widget-root");
          if (existing) {
            existing.remove();
            return;
          }
          const root = document.createElement("div");
          root.id = "feedback-widget-root";
          document.body.appendChild(root);
          // Simple mount via DOM — React would need a portal, this is a lightweight toggle
          root.innerHTML = `<div style="position:fixed;bottom:80px;right:24px;z-index:100;background:#0A0A0A;border:1px solid #1A1A1A;border-radius:12px;padding:20px;width:360px;animation:fadeSlideIn 0.2s cubic-bezier(0.16,1,0.3,1);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
              <h3 style="margin:0;font-size:15px;font-weight:600;color:#E8E8E8;letter-spacing:-0.01em;">Send Feedback</h3>
              <button id="feedback-close" style="background:none;border:none;cursor:pointer;font-size:18px;color:#555;transition:color 0.15s;padding:4px;border-radius:6px;line-height:1;">×</button>
            </div>
            <form id="feedback-form" style="display:flex;flex-direction:column;gap:10px;font-size:13px;">
              <select id="fb-category" style="padding:10px 12px;border-radius:8px;border:1px solid #1A1A1A;font-size:13px;background:#000;color:#C0C0C0;outline:none;transition:border-color 0.15s;cursor:pointer;">
                <option value="bug">Bug Report</option>
                <option value="feature-request">Feature Request</option>
                <option value="accuracy">Accuracy Concern</option>
                <option value="ux">User Experience</option>
                <option value="data-quality">Data Quality</option>
                <option value="other">Other</option>
              </select>
              <input id="fb-title" type="text" required placeholder="Brief title" style="padding:10px 12px;border-radius:8px;border:1px solid #1A1A1A;font-size:13px;background:#000;color:#E8E8E8;outline:none;transition:border-color 0.15s;" />
              <textarea id="fb-body" required rows="4" placeholder="Describe your feedback…" style="padding:10px 12px;border-radius:8px;border:1px solid #1A1A1A;font-size:13px;resize:vertical;font-family:inherit;background:#000;color:#E8E8E8;outline:none;transition:border-color 0.15s;"></textarea>
              <div id="fb-error" style="color:#FF6B6B;font-size:13px;display:none;"></div>
              <button type="submit" style="padding:10px 20px;border-radius:8px;border:none;background:#E8E8E8;color:#0A0A0A;font-size:13px;font-weight:600;cursor:pointer;transition:opacity 0.15s;">Submit Feedback</button>
            </form>
          </div>`;

          document.getElementById("feedback-close")?.addEventListener("click", () => root.remove());
          document.getElementById("feedback-form")?.addEventListener("submit", async (e) => {
            e.preventDefault();
            const cat = (document.getElementById("fb-category") as HTMLSelectElement).value;
            const title = (document.getElementById("fb-title") as HTMLInputElement).value;
            const body = (document.getElementById("fb-body") as HTMLTextAreaElement).value;
            const errEl = document.getElementById("fb-error")!;
            try {
              const res = await fetch("/api/feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ category: cat, title, body, pageUrl: window.location.href }),
              });
              if (!res.ok) throw new Error();
              root.innerHTML = '<div style="padding:40px 20px;text-align:center;animation:fadeSlideIn 0.2s cubic-bezier(0.16,1,0.3,1);"><div style="font-size:28px;margin-bottom:12px;">✓</div><h3 style="margin:0 0 8px;color:#E8E8E8;font-size:15px;font-weight:600;">Thank you!</h3><p style="color:#777;font-size:13px;margin:0;">Feedback received. We\'ll review it shortly.</p></div>';
              setTimeout(() => root.remove(), 2500);
            } catch {
              errEl.style.display = "block";
              errEl.textContent = "Could not submit. Try again.";
            }
          });
        }}
        style={{
          position: "fixed",
          bottom: "96px",
          right: "24px",
          zIndex: 99,
          width: "36px",
          height: "36px",
          borderRadius: "10px",
          border: "1px solid #1A1A1A",
          background: "#0A0A0A",
          color: "#555",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: 0.6,
          transition: "opacity 0.2s, border-color 0.2s, color 0.2s, transform 0.15s",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
        aria-label="Send feedback"
        onMouseEnter={(e) => {
          const btn = e.currentTarget;
          btn.style.opacity = "1";
          btn.style.borderColor = "#333";
          btn.style.color = "#C0C0C0";
          btn.style.transform = "scale(1.05)";
        }}
        onMouseLeave={(e) => {
          const btn = e.currentTarget;
          btn.style.opacity = "0.6";
          btn.style.borderColor = "#1A1A1A";
          btn.style.color = "#555";
          btn.style.transform = "scale(1)";
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      </button>

      {/* PRIVACY CONSENT BANNER */}
      <PrivacyConsentBanner />

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
          display:flex;
          border-top:${layout.borderWidth} solid ${colors.border};
          background:${colors.backdropGlassmorphic};
          backdrop-filter:blur(20px);
          -webkit-backdrop-filter:blur(20px);
          z-index:10;
          padding-bottom:env(safe-area-inset-bottom);
        }
        .tab-link {
          flex:1;
          flex-direction:column;
          font-size:${typography.caption.desktop.size};
          font-weight:500;
          line-height:${typography.caption.desktop.line};
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
            background:${colors.backdropGlassmorphic};
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
