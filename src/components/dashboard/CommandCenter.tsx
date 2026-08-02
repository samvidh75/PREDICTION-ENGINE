import { useNavigate } from "react-router-dom";
import {
  Radar, Scale, Wallet, Bookmark, BellRing, MessageSquareText,
  LineChart, LayoutGrid, ArrowRight, ArrowUpRight, type LucideIcon,
} from "lucide-react";

interface FeatureCard {
  icon: LucideIcon;
  title: string;
  desc: string;
  route: string;
}

/** First entry is the featured row — the tool most people reach for first
    (screening). Everything else sits in a compact list below it. Raycast
    convention: one accent color total, monochrome icons, restraint over
    decoration — no per-item rainbow tints or icon glow. */
const FEATURED: FeatureCard = {
  icon: Radar, title: "Scanner", desc: "Screen the whole PSE by quality, growth, value, and momentum.", route: "/scanner",
};

const FEATURES: FeatureCard[] = [
  { icon: Wallet, title: "Portfolio", desc: "Track holdings with AI-flagged risk and drift alerts.", route: "/portfolio" },
  { icon: Scale, title: "Compare", desc: "Put up to five companies side by side on the same metrics.", route: "/compare" },
  { icon: Bookmark, title: "Watchlist", desc: "Keep a shortlist of names you're actively following.", route: "/watchlist" },
  { icon: LayoutGrid, title: "Sectors", desc: "See how each PSE sector is trading relative to the index.", route: "/sectors" },
  { icon: LineChart, title: "Live Market", desc: "Real-time PSEi movement and breadth in one view.", route: "/live-market" },
  { icon: BellRing, title: "Alerts", desc: "Get notified on price, volume, or Healthometer score changes.", route: "/alerts" },
  { icon: MessageSquareText, title: "Ask AI", desc: "Ask a question about any PSE company in plain language.", route: "/chat" },
];

export function CommandCenter() {
  const navigate = useNavigate();

  return (
    <section aria-label="Command center" style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "grid", gap: 3 }}>
        <span className="eyebrow" style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--accent)" }}>
          Command center
        </span>
        <span style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>
          Everything you need, one click away.
        </span>
      </div>

      <div className="stockex-stagger" style={{ display: "grid", gap: 8 }}>
        {/* Featured row — the one accent-colored element on the page */}
        <button
          onClick={() => navigate(FEATURED.route)}
          className="group"
          style={{
            display: "flex", alignItems: "center", gap: 16,
            padding: "16px 18px",
            borderRadius: 10,
            border: "1px solid var(--accent-strong)",
            background: "var(--accent-soft)",
            cursor: "pointer",
            transition: "background 180ms var(--ease-soft), border-color 180ms var(--ease-soft)",
            textAlign: "left",
            width: "100%",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,107,74,0.20)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "var(--accent-soft)"; }}
        >
          <span
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 38, height: 38, flexShrink: 0,
              borderRadius: 8,
              background: "var(--accent)",
              color: "var(--accent-ink)",
            }}
          >
            <FEATURED.icon size={19} strokeWidth={2} />
          </span>
          <div style={{ display: "grid", gap: 2, flex: 1, minWidth: 0 }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 14.5, fontWeight: 600, color: "var(--text-primary)" }}>
              {FEATURED.title}
            </span>
            <span style={{ fontSize: 12.5, lineHeight: 1.4, color: "var(--text-body)" }}>
              {FEATURED.desc}
            </span>
          </div>
          <ArrowRight
            size={16}
            color="var(--accent)"
            style={{ flexShrink: 0, transition: "transform 200ms var(--ease-soft)" }}
            className="group-hover:translate-x-1"
          />
        </button>

        {/* Supporting list — flat rows, monochrome, dense */}
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: 10,
            overflow: "hidden",
            background: "var(--bg-sheet)",
          }}
        >
          {FEATURES.map((f, i) => (
            <button
              key={f.title}
              onClick={() => navigate(f.route)}
              className="group"
              style={{
                display: "flex", alignItems: "center", gap: 14,
                width: "100%",
                padding: "13px 18px",
                background: "transparent",
                border: "none",
                borderTop: i === 0 ? "none" : "1px solid var(--border)",
                cursor: "pointer",
                textAlign: "left",
                transition: "background 140ms var(--ease-soft)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-card)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <span
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: 30, height: 30, flexShrink: 0,
                  borderRadius: 7,
                  background: "var(--bg-chip)",
                  color: "var(--text-secondary)",
                }}
              >
                <f.icon size={15} strokeWidth={1.75} />
              </span>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, flex: 1, minWidth: 0 }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 13.5, fontWeight: 600, color: "var(--text-primary)", flexShrink: 0 }}>
                  {f.title}
                </span>
                <span
                  style={{
                    fontSize: 12.5, color: "var(--text-secondary)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}
                >
                  {f.desc}
                </span>
              </div>
              <ArrowUpRight
                size={14}
                color="var(--text-muted)"
                style={{ flexShrink: 0, opacity: 0, transition: "opacity 140ms var(--ease-soft)" }}
                className="group-hover:opacity-100"
              />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
