import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import ResearchAiChatPanel from "./ResearchAiChatPanel";
import type { ResearchAiContext } from "./researchAiTypes";

const orchestratorState = vi.hoisted(() => ({
  messages: [] as Array<{ id: string; role: "user" | "assistant" | "system"; text: string; createdAt: number }>,
  processing: false,
  activeRuntime: null as "deterministic" | "browser-edge" | "user-local" | "server-local" | null,
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
  symbol: "TEST",
  companyName: "TestCorp",
  narrative: ["Revenue grew 15% this quarter."],
  risksToReview: ["High debt levels."],
  whatToWatch: ["Upcoming earnings."],
  sector: "Technology",
  currentPrice: 1450,
  changeAbs: 23,
  changePercent: 1.64,
};

describe("ResearchAiChatPanel", () => {
  beforeEach(() => {
    orchestratorState.messages = [];
    orchestratorState.processing = false;
    orchestratorState.activeRuntime = null;
    orchestratorState.send.mockReset();
    orchestratorState.reset.mockReset();
  });

  it("renders the chat shell for a stock context", () => {
    render(<ResearchAiChatPanel context={sampleContext} />);

    expect(screen.getByTestId("chat-panel")).toBeTruthy();
    expect(screen.getByTestId("chat-input")).toBeTruthy();
    expect(screen.getAllByText("Research Chat").length).toBeGreaterThan(0);
  });

  it("renders messages from the orchestrator state", () => {
    orchestratorState.messages = [
      { id: "u1", role: "user", text: "How are margins?", createdAt: 1 },
      { id: "a1", role: "assistant", text: "Margins remain steady.", createdAt: 2 },
    ];

    render(<ResearchAiChatPanel context={sampleContext} />);

    expect(screen.getByText("How are margins?")).toBeTruthy();
    expect(screen.getByText("Margins remain steady.")).toBeTruthy();
    expect(screen.getByTestId("message-list")).toBeTruthy();
  });

  it("renders the runtime badge when a runtime is active", () => {
    orchestratorState.activeRuntime = "deterministic";

    render(<ResearchAiChatPanel context={sampleContext} />);

    expect(screen.getByTestId("runtime-badge").textContent).toMatch(/Algorithmic/i);
  });

  it("disables input when context is missing", () => {
    render(<ResearchAiChatPanel context={null} />);

    expect(screen.getByTestId("chat-input")).toHaveProperty("disabled", true);
  });
});
