/**
 * Phase 18F — ResearchAiChatPanel browser-local runtime tests.
 *
 * Covers runtime badge rendering for the Enhanced explanation runtime,
 * fallback label display, and context-sensitive badge behaviour.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import ResearchAiChatPanel from "./ResearchAiChatPanel";
import type { ResearchAiContext } from "./researchAiTypes";

const orchestratorState = vi.hoisted(() => ({
  messages: [] as Array<{ id: string; role: "user" | "assistant" | "system"; text: string; createdAt: number }>,
  processing: false,
  activeRuntime: null as string | null,
  send: vi.fn(),
  reset: vi.fn(),
  refresh: vi.fn(),
  runtimes: {} as Record<string, unknown>,
}));

vi.mock("./useResearchAiOrchestrator", () => ({
  useResearchAiOrchestrator: () => orchestratorState,
}));

vi.mock("./researchAiRuntimeRegistry", () => ({
  initRuntimeRegistry: vi.fn(),
}));

const sampleContext: ResearchAiContext = {
  surface: "stock",
  symbol: "TCS",
  companyName: "TCS Ltd",
  narrative: ["Revenue grew."],
  risksToReview: ["FX risk."],
  whatToWatch: ["Q3 results."],
  sector: "Technology",
  currentPrice: 4200,
  changeAbs: 12,
  changePercent: 0.29,
};

describe("ResearchAiChatPanel browserLocal runtime", () => {
  beforeEach(() => {
    orchestratorState.messages = [];
    orchestratorState.processing = false;
    orchestratorState.activeRuntime = null;
    orchestratorState.send.mockReset();
    orchestratorState.reset.mockReset();
  });

  /* 1 */ it("renders 'Enhanced explanation' badge for browser_local runtime", () => {
    orchestratorState.activeRuntime = "browser_local";
    render(<ResearchAiChatPanel context={sampleContext} />);
    expect(screen.getByTestId("runtime-badge").textContent).toMatch(/Enhanced explanation/i);
  });

  /* 2 */ it("renders 'Standard explanation' badge for deterministic runtime", () => {
    orchestratorState.activeRuntime = "deterministic";
    render(<ResearchAiChatPanel context={sampleContext} />);
    expect(screen.getByTestId("runtime-badge").textContent).toMatch(/Standard explanation/i);
  });

  /* 3 */ it("renders 'Edge AI' badge for browser-edge runtime", () => {
    orchestratorState.activeRuntime = "browser-edge";
    render(<ResearchAiChatPanel context={sampleContext} />);
    expect(screen.getByTestId("runtime-badge").textContent).toMatch(/Edge AI/i);
  });

  /* 4 */ it("renders 'On-device' badge for user-local runtime", () => {
    orchestratorState.activeRuntime = "user-local";
    render(<ResearchAiChatPanel context={sampleContext} />);
    expect(screen.getByTestId("runtime-badge").textContent).toMatch(/On-device/i);
  });

  /* 5 */ it("renders 'Enhanced research' badge for server-local runtime", () => {
    orchestratorState.activeRuntime = "server-local";
    render(<ResearchAiChatPanel context={sampleContext} />);
    expect(screen.getByTestId("runtime-badge").textContent).toMatch(/Enhanced research/i);
  });

  /* 6 */ it("does not render badge when no runtime is active", () => {
    orchestratorState.activeRuntime = null;
    render(<ResearchAiChatPanel context={sampleContext} />);
    expect(screen.queryByTestId("runtime-badge")).toBeNull();
  });

  /* 7 */ it("renders chat shell when browser_local is active", () => {
    orchestratorState.activeRuntime = "browser_local";
    render(<ResearchAiChatPanel context={sampleContext} />);
    expect(screen.getByTestId("chat-panel")).toBeTruthy();
    expect(screen.getByTestId("chat-input")).toBeTruthy();
  });

  /* 8 */ it("shows messages alongside browser_local badge", () => {
    orchestratorState.activeRuntime = "browser_local";
    orchestratorState.messages = [
      { id: "u1", role: "user", text: "Any risks?", createdAt: 1 },
      { id: "a1", role: "assistant", text: "FX risk is elevated.", createdAt: 2 },
    ];
    render(<ResearchAiChatPanel context={sampleContext} />);
    expect(screen.getByText("Any risks?")).toBeTruthy();
    expect(screen.getByText("FX risk is elevated.")).toBeTruthy();
    expect(screen.getByTestId("runtime-badge").textContent).toMatch(/Enhanced explanation/i);
  });
});
