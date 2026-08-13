import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { SECTORS } from "../stockstory/content/sector/SectorTypes";

const colors = {
  bg: "#0F1419",
  surface: "#1A1F26",
  border: "#2D3748",
  textPrimary: "#E2E8F0",
  textSecondary: "#94A3B8",
  cyan: "#0891B2",
  green: "#10B981",
  red: "#EF4444",
};

function nameToSlug(name: string): string {
  return name.toLowerCase().replace(/[&\s]+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export default function Sectors() {
  const navigate = useNavigate();

  return (
    <main
      style={{
        backgroundColor: colors.bg,
        color: colors.textPrimary,
        minHeight: "100vh",
        padding: "0",
      }}
    >
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${colors.border}`, padding: "16px 20px" }}>
        <h1
          style={{
            fontSize: "18px",
            fontWeight: 600,
            margin: "0 0 6px 0",
            color: colors.textPrimary,
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          Sector Research
        </h1>
        <p
          style={{
            fontSize: "12px",
            color: colors.textSecondary,
            margin: 0,
            lineHeight: 1.4,
            maxWidth: "600px",
          }}
        >
          Research-driven sector analysis. Compare company scorecards, trends, and peer performance across sectors. Not investment advice.
        </p>
      </div>

      {/* Sectors Table */}
      <div style={{ padding: "0" }}>
        <div
          style={{
            overflowX: "auto",
            borderBottom: `1px solid ${colors.border}`,
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "13px",
            }}
          >
            <thead>
              <tr style={{ borderBottom: `1px solid ${colors.border}`, backgroundColor: "rgba(45, 55, 72, 0.3)" }}>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontWeight: 600,
                    color: colors.textSecondary,
                    fontSize: "11px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    fontFamily: "'Courier New', monospace",
                    borderRight: `1px solid ${colors.border}`,
                  }}
                >
                  Sector
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontWeight: 600,
                    color: colors.textSecondary,
                    fontSize: "11px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    fontFamily: "'Courier New', monospace",
                    borderRight: `1px solid ${colors.border}`,
                  }}
                >
                  Description
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    textAlign: "center",
                    fontWeight: 600,
                    color: colors.textSecondary,
                    fontSize: "11px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    fontFamily: "'Courier New', monospace",
                  }}
                >
                  Companies
                </th>
              </tr>
            </thead>
            <tbody>
              {SECTORS.map((sector, index) => {
                const slug = nameToSlug(sector.name);
                return (
                  <tr
                    key={sector.slug}
                    onClick={() => navigate(`/sectors/${slug}`)}
                    style={{
                      borderBottom: `1px solid ${colors.border}`,
                      cursor: "pointer",
                      transition: "background-color 150ms ease",
                      backgroundColor: "transparent",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "rgba(8, 145, 178, 0.05)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "transparent";
                    }}
                  >
                    <td
                      style={{
                        padding: "12px 16px",
                        color: colors.cyan,
                        fontWeight: 600,
                        fontFamily: "'Courier New', monospace",
                        borderRight: `1px solid ${colors.border}`,
                      }}
                    >
                      {sector.name}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        color: colors.textSecondary,
                        borderRight: `1px solid ${colors.border}`,
                        maxWidth: "300px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {sector.description}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        textAlign: "center",
                        color: colors.textPrimary,
                        fontFamily: "'Courier New', monospace",
                        fontWeight: 500,
                      }}
                    >
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                        {sector.companyCount}
                        <ChevronRight size={14} color={colors.textSecondary} strokeWidth={2} />
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "12px 16px",
          borderTop: `1px solid ${colors.border}`,
          fontSize: "11px",
          color: colors.textSecondary,
          backgroundColor: "rgba(45, 55, 72, 0.2)",
        }}
      >
        <p style={{ margin: 0 }}>StockEX provides research analysis only. Not investment advice. Consult a PSE-listed investment advisor.</p>
      </div>
    </main>
  );
}
