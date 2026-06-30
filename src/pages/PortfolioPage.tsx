import { useNavigate } from "react-router-dom";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { StaggerContainer } from "../ui/MicroInteractions";
import { useResponsiveValue } from "../ui/responsive";
import { colors, typography, layout, radius } from "../design/tokens";
import { BarChart3, Plus, TrendingUp } from "lucide-react";

export default function PortfolioPage() {
  const navigate = useNavigate();
  const isMobile = useResponsiveValue(true, false);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: layout.pagePaddingDesktop }}>
      {/* Header */}
      <StaggerContainer>
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <BarChart3 size={24} color={colors.primary} />
            <h1 style={{ fontSize: typography.h2.desktop.size, fontWeight: 700, color: colors.ink, margin: 0 }}>
              Portfolio
            </h1>
          </div>
          <p style={{ color: colors.body, fontSize: typography.body.desktop.size, margin: 0 }}>
            Track thesis, allocation context, and portfolio research once you add companies.
          </p>
        </div>
      </StaggerContainer>

      {/* Empty state */}
      <StaggerContainer staggerMs={80}>
        <Card variant="elevated" style={{ padding: "48px 24px", textAlign: "center" }}>
          <div style={{ marginBottom: 20 }}>
            <TrendingUp size={48} color={colors.body} style={{ opacity: 0.3 }} />
          </div>
          <h2 style={{ fontSize: typography.h3.desktop.size, fontWeight: 600, color: colors.ink, margin: "0 0 12px 0" }}>
            No portfolio companies are being tracked yet.
          </h2>
          <p style={{ color: colors.body, fontSize: typography.body.desktop.size, margin: "0 0 24px 0", maxWidth: 480, lineHeight: 1.6 }}>
            Add companies to your watchlist to start monitoring thesis changes.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            <Button variant="primary" size="sm" onClick={() => navigate("/watchlist")}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Plus size={16} /> Go to Watchlist
              </span>
            </Button>
            <Button variant="secondary" size="sm" onClick={() => navigate("/scanner")}>
              Explore stocks
            </Button>
          </div>
          <p style={{
            color: colors.body,
            fontSize: "12px",
            margin: "32px 0 0 0",
            fontStyle: "italic",
            opacity: 0.6,
          }}>
            Portfolio research context only. Not a broker account.
          </p>
        </Card>
      </StaggerContainer>

      {!isMobile && (
        <div style={{ marginTop: 40, textAlign: "center" }}>
          <Button variant="secondary" size="sm" onClick={() => navigate("/compare")}>
            Compare with benchmarks →
          </Button>
        </div>
      )}
    </div>
  );
}
