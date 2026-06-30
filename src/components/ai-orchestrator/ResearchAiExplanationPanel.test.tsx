import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ResearchAiExplanationPanel } from "./ResearchAiExplanationPanel";

beforeEach(() => {
  vi.stubGlobal("matchMedia", vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })));
});

describe("ResearchAiExplanationPanel", () => {
  it("renders safe copy", () => {
    render(
      <ResearchAiExplanationPanel
        context={{
          surface: "stock",
          headline: "Research is improving.",
          risksToReview: ["Valuation needs review."],
        }}
      />,
    );

    expect(screen.getByText("AI explanation")).toBeTruthy();
    expect(screen.getByText(/Research context only\. Not a recommendation\./i)).toBeTruthy();
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

    expect(document.body.textContent).not.toMatch(/WebGPU|Ollama|provider|backend/i);
  });
});
