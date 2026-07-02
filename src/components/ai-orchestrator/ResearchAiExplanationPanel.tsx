import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { colors, space, typography } from "../../design/tokens";
import { Button } from "../../ui/Button";
import { Panel } from "../../ui/Panel";
import { compressResearchAiContext } from "./researchAiContext";
import { buildDeterministicFallbackAnswer } from "./researchAiGuardrails";
import type { ResearchAiContext } from "./researchAiTypes";
import { useBrowserLocalResearchRuntime } from "./useBrowserLocalResearchRuntime";

export function ResearchAiExplanationPanel({ context }: { context: ResearchAiContext | null }) {
  const [question, setQuestion] = useState("");
  const runtime = useBrowserLocalResearchRuntime();

  const deterministicText = useMemo(
    () => (context ? buildDeterministicFallbackAnswer(context).text : null),
    [context],
  );

  const compressedContext = useMemo(
    () => (context ? compressResearchAiContext(context) : ""),
    [context],
  );

  if (!context) return null;

  const supportsEnhancedStart =
    context.surface === "stock" || context.surface === "healthometer";
  const canStart = runtime.status.status === "unloaded" || runtime.status.status === "idle";
  const showQuestionBox = !supportsEnhancedStart || runtime.status.status === "ready";
  const helperCopy =
    runtime.status.status === "unsupported"
      ? "Summary view is unavailable on this device."
      : runtime.status.status === "failed"
        ? "A standard summary is available for this view."
        : "A standard summary is available for this view.";

  return (
    <Panel variant="elevated" style={{ display: "grid", gap: space[4] }}>
      <Panel.Header icon={<Sparkles size={16} color={colors.primary} />} title="Research summary" />

      <Panel.Content style={{ display: "grid", gap: space[3] }}>
        <div style={{ display: "grid", gap: "4px" }}>
          <h3 style={{ margin: 0, color: colors.textPrimary, fontSize: typography.h3.desktop.size, lineHeight: "1.25" }}>
            Highlights the main thesis signals already shown on this page.
          </h3>
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
          {runtime.explanation ?? deterministicText ?? "Standard summary is available for this view."}
        </div>

        {runtime.isStarting || runtime.isGenerating ? (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <div style={{ color: colors.textSecondary, fontSize: "13px" }}>
              {runtime.progress?.message ?? "Preparing summary\u2026"}
              {runtime.progress?.percent != null ? ` (${runtime.progress.percent}%)` : ""}
            </div>
            <Button
              variant="secondary"
              onClick={() => runtime.cancel()}
              style={{ fontSize: "12px", padding: "4px 12px", minHeight: "auto" }}
            >
              Cancel
            </Button>
          </div>
        ) : runtime.progress?.message ? (
          <div style={{ color: colors.textSecondary, fontSize: "13px" }}>
            {runtime.progress.message}
          </div>
        ) : (
          <div style={{ color: colors.textSecondary, fontSize: "13px" }}>{helperCopy}</div>
        )}

        {showQuestionBox ? (
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
        ) : null}

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
          {supportsEnhancedStart && canStart ? (
            <Button
              variant="primary"
              disabled={runtime.busy}
              onClick={async () => {
                const canUse = await runtime.canUse();
                if (canUse) {
                  await runtime.start();
                }
              }}
            >
              Start summary
            </Button>
          ) : null}

          {showQuestionBox ? (
            <Button
              variant="primary"
              disabled={runtime.busy}
              onClick={async () => {
                if (supportsEnhancedStart) {
                  await runtime.explain(compressedContext, question || "Explain this view");
                }
              }}
            >
              Explain this view
            </Button>
          ) : null}

          {supportsEnhancedStart && showQuestionBox ? (
            <Button
              variant="secondary"
              disabled={runtime.busy}
              onClick={async () => {
                setQuestion("");
                await runtime.reset();
              }}
            >
              Reset
            </Button>
          ) : null}
        </div>
      </Panel.Content>
    </Panel>
  );
}
