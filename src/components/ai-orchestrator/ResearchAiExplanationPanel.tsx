import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { colors, space, typography } from "../../design/tokens";
import { Button } from "../../ui/Button";
import { Card, CardLabel } from "../../ui/Card";
import { detectDeviceAiCapability } from "./deviceAiCapability";
import { answerResearchQuestion } from "./researchAiOrchestrator";
import type { ResearchAiContext, ResearchAiResponse } from "./researchAiTypes";

export function ResearchAiExplanationPanel({ context }: { context: ResearchAiContext | null }) {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<ResearchAiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const capability = useMemo(() => detectDeviceAiCapability(), []);

  if (!context) return null;

  const fallbackCopy = capability.canUseBrowserLocalAi
    ? "Standard explanation is available for this view."
    : "Standard explanation is available for this view.";

  return (
    <Card
      className="luxury-panel"
      style={{
        display: "grid",
        gap: space[4],
        overflow: "hidden",
      }}
    >
      <div style={{ display: "grid", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Sparkles size={16} color={colors.primary} />
          <CardLabel>AI explanation</CardLabel>
        </div>
        <h3 style={{ margin: 0, color: colors.textPrimary, fontSize: typography.h3.desktop.size, lineHeight: "1.25" }}>
          Explains the research context already shown on this page.
        </h3>
        <p style={{ margin: 0, color: colors.textSecondary, fontSize: typography.body.desktop.size, lineHeight: "1.5" }}>
          Research context only. Not a recommendation.
        </p>
      </div>

      <label style={{ display: "grid", gap: "8px" }}>
        <span style={{ color: colors.textSecondary, fontSize: "13px" }}>
          Ask what changed, what risks matter, or what to watch.
        </span>
        <input
          aria-label="AI research question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask what changed, what risks matter, or what to watch."
          style={{
            minHeight: "44px",
            width: "100%",
            border: `1px solid ${colors.border}`,
            borderRadius: "18px",
            padding: "0 14px",
            color: colors.textPrimary,
            background: colors.card,
            boxSizing: "border-box",
          }}
        />
      </label>

      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
        <Button
          variant="primary"
          disabled={loading}
          onClick={async () => {
            setLoading(true);
            const next = await answerResearchQuestion({
              surface: context.surface,
              context,
              question: question || "Explain this view",
              preferredRuntime: "browser_local",
            });
            setResponse(next);
            setLoading(false);
          }}
        >
          Explain this view
        </Button>
        <span style={{ color: colors.textSecondary, fontSize: "13px" }}>{fallbackCopy}</span>
      </div>

      <div
        style={{
          color: colors.textPrimary,
          fontSize: typography.body.desktop.size,
          lineHeight: "1.6",
          borderTop: `1px solid ${colors.border}`,
          paddingTop: space[3],
          overflowWrap: "anywhere",
        }}
      >
        {loading ? "Preparing explanation..." : response?.text ?? fallbackCopy}
      </div>
    </Card>
  );
}
