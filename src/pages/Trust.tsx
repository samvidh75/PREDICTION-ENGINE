import { useResponsiveValue } from "../ui/responsive";
import { colors, typography, layout } from "../design/tokens";
import { ResearchOnlyDisclosure } from "../components/trust/ResearchOnlyDisclosure";

const SECTIONS = [
  {
    id: "what-we-are",
    title: "What Equity Lens India Is",
    content: "Equity Lens India is a structured equity research platform. We provide scorecards, theses, risk assessments, scenario analysis, and peer comparisons for listed Indian equities. Our output is research analysis — not investment advice."
  },
  {
    id: "what-we-are-not",
    title: "What Equity Lens India Is Not",
    content: "We are not a SEBI-registered investment advisor. We do not make buy/sell/hold recommendations. We do not provide target prices. We do not offer portfolio management services. We are not a trading platform or brokerage."
  },
  {
    id: "research-only",
    title: "Research-Only Policy",
    content: "Every feature on Equity Lens India is designed for research purposes. Scorecards are for relative comparison within our framework, not for making specific trading decisions. Confidence indicators signal data quality, not conviction in a price outcome."
  },
  {
    id: "data-sources",
    title: "Data Sources & Accuracy",
    content: "We aggregate data from exchange filings, regulatory databases, and market data sources. All data is timestamped and attributed. Where data is unavailable or stale, scores reflect lower confidence indicators. We do not guarantee data accuracy — users should verify critical data points independently."
  },
  {
    id: "limitations",
    title: "Methodological Limitations",
    content: "Our research framework has inherent limitations. It uses historical data which may not predict future outcomes. It may not capture inflection points, macroeconomic shifts, or black-swan events. Different methodologies may produce different assessments. All research outputs should be one input among many in investment decision-making."
  },
  {
    id: "conflicts",
    title: "Conflicts of Interest",
    content: "Equity Lens India does not accept compensation from listed companies for research. We do not engage in paid promotions of stocks. We do not hold trading positions in securities we analyze. Our revenue comes from user subscriptions for premium research — not from companies or market intermediaries."
  },
  {
    id: "user-responsibility",
    title: "User Responsibility",
    content: "Users are responsible for their own investment decisions. Research outputs from Equity Lens India should be independently verified. Consult a SEBI-registered investment advisor before making investment decisions. Past performance of any company or score does not guarantee future results."
  },
  {
    id: "feedback",
    title: "Questions & Feedback",
    content: "We welcome questions about our methodology, data sources, and limitations. If something in our research seems incorrect or unclear, please reach out. Transparency is a design principle, not an afterthought."
  }
];

export default function Trust() {
  const contentWidth = useResponsiveValue("100%", "740px");

  return (
    <main className="raycast-slideUp" style={{ maxWidth: contentWidth, margin: "0 auto", padding: layout.pagePaddingDesktop, color: colors.textPrimary }}>

      <section className="raycast-stagger-1" style={{ marginBottom: "48px" }}>
        <h1 style={{ fontSize: typography.h2.desktop.size, fontWeight: 700, marginBottom: "12px" }}>
          Trust and Disclosures
        </h1>
        <p style={{ fontSize: typography.body.desktop.size, color: colors.textSecondary, lineHeight: 1.6 }}>
          What Equity Lens India is, what it is not, and what you can expect from our research. Transparency is a design principle.
        </p>
      </section>

      <div className="raycast-stagger-2" style={{ animationDelay: "0.1s" }}>
      <ResearchOnlyDisclosure />

      </div>

      <div className="raycast-stagger-3" style={{ animationDelay: "0.2s" }}>
      {SECTIONS.map((section) => (
        <article
          key={section.id}
          id={section.id}
          style={{ marginBottom: "36px" }}
        >
          <h2 style={{ fontSize: typography.h3.desktop.size, fontWeight: 600, marginBottom: "12px" }}>
            {section.title}
          </h2>
          <p style={{ fontSize: typography.body.desktop.size, color: colors.textSecondary, lineHeight: 1.8 }}>
            {section.content}
          </p>
        </article>
      ))}
      </div>

      <footer className="raycast-stagger-4" style={{ animationDelay: "0.3s", marginTop: "48px", paddingTop: "24px", borderTop: `1px solid ${colors.border}`, fontSize: "13px", color: colors.textSecondary }}>
        <p>Research analysis only. Not investment advice. Consult a SEBI-registered investment advisor before making investment decisions.</p>
      </footer>
    </main>
  );
}
