import { useParams, useNavigate } from "react-router-dom";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { useResponsiveValue } from "../ui/responsive";
import { colors, typography, layout } from "../design/tokens";
import { SEBIComplianceBanner } from "../components/SEBICompliance";
import { SCANNER_PRESETS, getScannerPreset } from "../frontend/scanner/scannerLandingConfig";

export default function ScannerLanding() {
  const { preset } = useParams<{ preset: string }>();
  const navigate = useNavigate();
  const contentWidth = useResponsiveValue("100%", "720px");

  const presetConfig = preset ? getScannerPreset(preset) : undefined;

  if (preset && !presetConfig) {
    return (
      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: layout.pagePaddingDesktop }}>
        <SEBIComplianceBanner />
        <h1 style={{ fontSize: typography.h2.desktop.size, color: colors.textPrimary }}>Scanner Preset Not Found</h1>
        <p style={{ color: colors.textSecondary }}>This scanner preset doesn't exist. Try one of our standard presets.</p>
        <Button onClick={() => navigate("/scanner")} style={{ marginTop: "16px" }}>
          Open Scanner
        </Button>
      </main>
    );
  }

  if (presetConfig) {
    return (
      <main style={{ maxWidth: contentWidth, margin: "0 auto", padding: layout.pagePaddingDesktop, color: colors.textPrimary }}>
        <SEBIComplianceBanner />

        <nav style={{ marginBottom: "24px", fontSize: "14px", color: colors.textSecondary }}>
          <span style={{ cursor: "pointer", color: colors.primary }} onClick={() => navigate("/scanner")}>
            Scanner
          </span>
          <span style={{ margin: "0 8px" }}>/</span>
          <span>{presetConfig.label}</span>
        </nav>

        <section style={{ marginBottom: "36px" }}>
          <h1 style={{ fontSize: typography.h2.desktop.size, fontWeight: 700, marginBottom: "16px" }}>
            {presetConfig.label}
          </h1>
          <p style={{ fontSize: typography.body.desktop.size, color: colors.textSecondary, lineHeight: 1.6, marginBottom: "24px" }}>
            {presetConfig.description}
          </p>
          <Button onClick={() => navigate(`/scanner?preset=${presetConfig.id}`)}>
            View {presetConfig.label} in Scanner
          </Button>
        </section>

        <footer style={{ marginTop: "48px", paddingTop: "24px", borderTop: `1px solid ${colors.border}`, fontSize: "13px", color: colors.textSecondary }}>
          <p>Research analysis only. Not investment advice.</p>
        </footer>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: "1200px", margin: "0 auto", padding: layout.pagePaddingDesktop, color: colors.textPrimary }}>
      <SEBIComplianceBanner />

      <section style={{ marginBottom: "48px" }}>
        <h1 style={{ fontSize: typography.h2.desktop.size, fontWeight: 700, marginBottom: "8px" }}>Research Scanner Presets</h1>
        <p style={{ fontSize: typography.body.desktop.size, color: colors.textSecondary, maxWidth: "600px", lineHeight: 1.6 }}>
          Choose a research preset to screen companies by specific criteria. Not investment advice.
        </p>
      </section>

      <section>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(280px, 1fr))`, gap: "20px" }}>
          {SCANNER_PRESETS.map((p) => (
            <Card
              key={p.id}
              style={{ padding: "24px" }}
              onClick={() => navigate(`/scanner/${p.id}`)}
            >
              <h3 style={{ fontSize: typography.h3.desktop.size, fontWeight: 600, marginBottom: "8px", color: colors.textPrimary }}>
                {p.label}
              </h3>
              <p style={{ fontSize: "14px", color: colors.textSecondary, lineHeight: 1.5 }}>
                {p.description}
              </p>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
