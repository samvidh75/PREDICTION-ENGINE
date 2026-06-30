import { useParams } from "react-router-dom";
import { useResponsiveValue } from "../ui/responsive";
import { colors, typography, layout, radius, shadows } from "../design/tokens";
import { buildResearchReport } from "../stockstory/reports/CompanyResearchReportBuilder";
import type { CompanyReportSection } from "../stockstory/reports/CompanyResearchReportTypes";

function getSampleSections(): CompanyReportSection[] {
  return [
    { title: "Business Overview", content: "Company overview and business model description would appear here based on available data.", type: "text" },
    { title: "Financial Health", content: "Revenue trends, margin analysis, and key financial metrics for the company.", type: "score" },
    { title: "Competitive Position", content: "Market position, moat analysis, and competitive advantages relative to peers.", type: "text" },
    { title: "Risk Assessment", content: "Key business and market risks that could impact the company's performance.", type: "risk" },
    { title: "Investment Thesis", content: "Bull and bear case scenarios for the company based on available data.", type: "thesis" },
  ];
}

export default function CompanyResearchReport() {
  const { symbol } = useParams<{ symbol: string }>();
  const contentWidth = useResponsiveValue("100%", "740px");
  const companyName = symbol?.toUpperCase() || "Unknown";

  const report = buildResearchReport(
    symbol || "UNKNOWN",
    companyName,
    "N/A",
    getSampleSections(),
  );

  if (!symbol) {
    return (
      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: layout.pagePaddingDesktop }}>
        <h1 style={{ fontSize: typography.h2.desktop.size, color: colors.textPrimary }}>Report Not Found</h1>
        <p style={{ color: colors.textSecondary }}>No symbol specified for the research report.</p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: contentWidth, margin: "0 auto", padding: layout.pagePaddingDesktop, color: colors.textPrimary }}>

      <section style={{ marginBottom: "36px" }}>
        <p style={{ fontSize: typography.caption.desktop.size, color: colors.textSecondary, marginBottom: "4px" }}>
          Research Report
        </p>
        <h1 style={{ fontSize: typography.h2.desktop.size, fontWeight: 700, marginBottom: "4px" }}>
          {report.companyName} ({report.symbol})
        </h1>
        <p style={{ fontSize: "14px", color: colors.textSecondary }}>
          Sector: {report.sector} &middot; Generated: {new Date(report.generatedAt).toLocaleDateString("en-IN")}
        </p>
      </section>

      {report.sections.map((section, index) => (
        <article key={index} style={{ marginBottom: "32px" }}>
          <h2 style={{ fontSize: typography.h3.desktop.size, fontWeight: 600, marginBottom: "12px", color: colors.textPrimary }}>
            {section.title}
          </h2>
          <div
            style={{
              padding: "16px",
              background: colors.card,
              borderRadius: radius.md,
              border: `1px solid ${colors.border}`,
              boxShadow: shadows.card,
            }}
          >
            <p style={{ fontSize: typography.body.desktop.size, color: colors.textSecondary, lineHeight: 1.6 }}>
              {section.content}
            </p>
          </div>
        </article>
      ))}

      <footer style={{ marginTop: "48px", paddingTop: "24px", borderTop: `1px solid ${colors.border}`, fontSize: "13px", color: colors.textSecondary }}>
        <p>{report.disclaimer}</p>
      </footer>
    </main>
  );
}
