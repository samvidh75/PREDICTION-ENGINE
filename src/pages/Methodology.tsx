import { useNavigate } from "react-router-dom";
import { useResponsiveValue } from "../ui/responsive";
import { colors, typography, layout } from "../design/tokens";
import { METHODOLOGY_SECTIONS } from "../stockstory/content/methodology/MethodologyContent";

export default function Methodology() {
  const navigate = useNavigate();
  const contentWidth = useResponsiveValue("100%", "740px");

  return (
    <main style={{ maxWidth: contentWidth, margin: "0 auto", padding: layout.pagePaddingDesktop, color: colors.textPrimary }}>

      <section style={{ marginBottom: "48px" }}>
        <h1 style={{ fontSize: typography.h2.desktop.size, fontWeight: 700, marginBottom: "12px" }}>
          Research Methodology
        </h1>
        <p style={{ fontSize: typography.body.desktop.size, color: colors.textSecondary, lineHeight: 1.6 }}>
          How StockStory India evaluates and scores listed Indian equities. Transparent, documented, and methodology-first.
          Not investment advice.
        </p>
      </section>

      <nav style={{ marginBottom: "36px", padding: "16px", background: colors.fill, borderRadius: "8px" }}>
        <h2 style={{ fontSize: "15px", fontWeight: 600, marginBottom: "8px", color: colors.textSecondary }}>On this page</h2>
        {METHODOLOGY_SECTIONS.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            style={{ display: "block", padding: "4px 0", fontSize: "14px", color: colors.primary, textDecoration: "none" }}
            onClick={(e) => {
              e.preventDefault();
              const el = document.getElementById(section.id);
              el?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            {section.title}
          </a>
        ))}
      </nav>

      {METHODOLOGY_SECTIONS.map((section) => (
        <article
          key={section.id}
          id={section.id}
          style={{ marginBottom: "48px", scrollMarginTop: "24px" }}
        >
          <h2 style={{ fontSize: typography.h3.desktop.size, fontWeight: 600, marginBottom: "12px", color: colors.textPrimary }}>
            {section.title}
          </h2>
          <p style={{ fontSize: typography.body.desktop.size, color: colors.textSecondary, lineHeight: 1.8, marginBottom: "16px" }}>
            {section.content}
          </p>
          {section.subsections?.map((sub) => (
            <div key={sub.title} style={{ marginLeft: "16px", marginBottom: "16px", paddingLeft: "12px", borderLeft: `2px solid ${colors.border}` }}>
              <h3 style={{ fontSize: "15px", fontWeight: 600, marginBottom: "4px", color: colors.textPrimary }}>
                {sub.title}
              </h3>
              <p style={{ fontSize: "14px", color: colors.textSecondary, lineHeight: 1.7 }}>
                {sub.content}
              </p>
            </div>
          ))}
        </article>
      ))}

      <footer style={{ marginTop: "48px", paddingTop: "24px", borderTop: `1px solid ${colors.border}`, fontSize: "13px", color: colors.textSecondary }}>
        <p>This methodology is updated as the framework evolves. Significant changes are logged in the changelog.</p>
      </footer>
    </main>
  );
}
