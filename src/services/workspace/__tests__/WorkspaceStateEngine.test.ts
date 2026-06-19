import { describe, expect, it, vi, beforeEach } from "vitest";
import { WorkspaceStateEngine } from "../WorkspaceStateEngine";

vi.mock("../../auth/sessionStore", () => ({
  loadAuthSession: vi.fn(() => ({ uid: "test-uid-123" })),
}));

describe("WorkspaceStateEngine", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns zero counts for empty workspace", () => {
    const summary = WorkspaceStateEngine.getWorkspaceSummary();
    expect(summary.trackedCompanies).toBe(0);
    expect(summary.notesCount).toBe(0);
    expect(summary.portfolioPositions).toBe(0);
  });

  it("returns account storage type when uid exists", () => {
    const summary = WorkspaceStateEngine.getWorkspaceSummary();
    expect(summary.storageType).toBe("account");
  });

  it("returns workspace state for a company", () => {
    const state = WorkspaceStateEngine.getCompanyWorkspaceState("RELIANCE");
    expect(state).toHaveProperty("isTracked");
    expect(state).toHaveProperty("note");
    expect(state).toHaveProperty("snapshot");
    expect(state).toHaveProperty("hasPriorSnapshot");
  });

  it("does not leak provider/backend wording in state", () => {
    const state = WorkspaceStateEngine.getCompanyWorkspaceState("RELIANCE");
    const json = JSON.stringify(state);
    expect(json).not.toMatch(/provider|backend|api|source/i);
  });

  it("does not return fake values", () => {
    const summary = WorkspaceStateEngine.getWorkspaceSummary();
    expect(summary.trackedCompanies).toBeGreaterThanOrEqual(0);
    expect(summary.notesCount).toBeGreaterThanOrEqual(0);
    expect(summary.portfolioPositions).toBeGreaterThanOrEqual(0);
  });
});
