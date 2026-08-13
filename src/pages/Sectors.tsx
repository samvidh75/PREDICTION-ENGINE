import { useNavigate } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { SECTORS } from "../stockstory/content/sector/SectorTypes";
import { colors, typography } from "../design/tokens";

const SECTOR_ACCENTS: Record<string, string> = {
  financials: "#C98A4B",
  industrial: "#3FB67A",
  "holding-firms": "#B08AD4",
  property: "#E15B4F",
  services: "#5FA8D3",
  "mining-oil": "#E0A339",
};

function nameToSlug(name: string): string {
  return name.toLowerCase().replace(/[&\s]+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export default function Sectors() {
  const navigate = useNavigate();
  const totalCompanies = SECTORS.reduce((sum, s) => sum + s.companyCount, 0);

  return (
    <div style={{ padding: "28px clamp(16px, 4vw, 40px) 56px", maxWidth: 1280, margin: "0 auto" }}>
      {/* ── Header ── */}
      <div style={{ marginBottom: 28 }}>
        <span style={{ fontFamily: typography.monoFamily, fontSize: 11, letterSpacing: "0.10em", textTransform: "uppercase", color: colors.primary }}>
          PSEi-30 taxonomy
        </span>
        <h1 style={{ fontFamily: typography.serifFamily, fontStyle: "italic", fontWeight: 500, fontSize: 28, color: colors.ink, margin: "6px 0 6px", letterSpacing: "-0.01em" }}>
          The six sectors that move the index.
        </h1>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: colors.body, margin: 0, maxWidth: 640 }}>
          The PSE's own classification, covering all {totalCompanies} PSEi-30 constituents. Open a sector
          to compare scorecards, rotation, and peer performance within it.
        </p>
      </div>

      {/* ── Sector cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
        {SECTORS.map((sector) => {
          const slug = nameToSlug(sector.name);
          const accent = SECTOR_ACCENTS[sector.slug] ?? colors.primary;
          const share = Math.round((sector.companyCount / totalCompanies) * 100);
          return (
            <button
              key={sector.slug}
              onClick={() => navigate(`/sectors/${slug}`)}
              style={{
                textAlign: "left", background: colors.surface,
                border: `1px solid ${colors.hairline}`, borderRadius: 14,
                padding: 20, cursor: "pointer", display: "grid", gap: 14,
                transition: "border-color 0.15s ease, background 0.15s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.hairlineStrong; e.currentTarget.style.background = colors.surfaceElevated; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.hairline; e.currentTarget.style.background = colors.surface; }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: accent, flexShrink: 0 }} />
                  <span style={{ fontSize: 16, fontWeight: 600, color: colors.ink }}>{sector.name}</span>
                </div>
                <ArrowUpRight size={16} color={colors.mute} />
              </div>

              <p style={{ fontSize: 13.5, lineHeight: 1.55, color: colors.body, margin: 0 }}>
                {sector.description}
              </p>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 4, borderTop: `1px solid ${colors.hairline}`, marginTop: 2 }}>
                <span style={{ fontFamily: typography.monoFamily, fontSize: 20, fontWeight: 600, color: colors.ink }}>
                  {sector.companyCount}
                  <span style={{ fontSize: 11, fontWeight: 500, color: colors.mute, marginLeft: 6, fontFamily: typography.fontFamily }}>
                    of PSEi-30
                  </span>
                </span>
                <div style={{ width: 64, height: 4, borderRadius: 999, background: colors.hairline, overflow: "hidden" }}>
                  <div style={{ width: `${share}%`, height: "100%", background: accent }} />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Footer note ── */}
      <p style={{ fontSize: 12, color: colors.mute, marginTop: 28, lineHeight: 1.6, maxWidth: 720 }}>
        StockEx provides independent research analysis only, not investment advice. Sector
        classification and company counts reflect the verified PSEi-30 membership.
      </p>
    </div>
  );
}
