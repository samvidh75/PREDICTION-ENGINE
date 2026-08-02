import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ResearchAiExplanationPanel } from "./ResearchAiExplanationPanel";

const runtimeState = vi.hoisted(() => ({
  status: { status: "unloaded", statusMessage: "" },
  busy: false,
  progress: null as null | { stage: string; message?: string },
  explanation: null as string | null,
  start: vi.fn(async () => {}),
  explain: vi.fn(async () => null),
  reset: vi.fn(async () => {}),
  stop: vi.fn(async () => {}),
  canUse: vi.fn(async () => true),
  clearExplanation: vi.fn(),
}));

vi.mock("./useBrowserLocalResearchRuntime", () => ({
  useBrowserLocalResearchRuntime: () => runtimeState,
}));

beforeEach(() => {
  runtimeState.status = { status: "unloaded", statusMessage: "" };
  runtimeState.busy = false;
  runtimeState.progress = null;
  runtimeState.explanation = null;
  runtimeState.start.mockClear();
  runtimeState.explain.mockClear();
  runtimeState.reset.mockClear();
  runtimeState.canUse.mockClear();
});

describe("ResearchAiExplanationPanel", () => {
  it("renders safe copy and start action", () => {
    render(
      <ResearchAiExplanationPanel
        context={{
          surface: "stock",
          headline: "Research is improving.",
          risksToReview: ["Valuation needs review."],
        }}
      />,
    );

    expect(screen.getByText("Research summary")).toBeTruthy();
    expect(screen.getByText(/Highlights the main thesis signals already shown on this page\./i)).toBeTruthy();
    expect(screen.getByText("Start summary")).toBeTruthy();
  });

  it("starts only after explicit user action", async () => {
    render(
      <ResearchAiExplanationPanel
        context={{
          surface: "stock",
          headline: "Research is improving.",
        }}
      />,
    );

    fireEvent.click(screen.getByText("Start summary"));
    await Promise.resolve();
    expect(runtimeState.canUse).toHaveBeenCalled();
    expect(runtimeState.start).toHaveBeenCalled();
  });

  it("does not expose model or runtime names", () => {
    render(
      <ResearchAiExplanationPanel
        context={{
          surface: "stock",
          headline: "Research is improving.",
        }}
      />,
    );

    expect(document.body.textContent).not.toMatch(/WebGPU|WebLLM|Ollama|Qwen|provider|backend/i);
  });
});
