import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import TrustCentrePage from "./TrustCentrePage";

const oldStaticValues = ["0.12", "0.68", "1.85", "0.72", "106,920", "493,200"];

function mockFetchJson(payload: unknown, ok = true) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    json: vi.fn().mockResolvedValue(payload),
  }));
}

describe("TrustCentrePage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders loading state before the trust metrics request resolves", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => undefined)));

    render(<TrustCentrePage />);

    expect(screen.getByText("Loading trust metrics...")).toBeTruthy();
  });

  it("renders Data unavailable for missing metric fields", async () => {
    mockFetchJson({
      status: "partial",
      data: {
        alpha: null,
        hit_rate: 61.25,
        total_predictions: 12,
      },
      dataState: {
        availability: "partial",
        asOf: "2026-06-10",
        missingInputs: ["alpha", "sharpe_ratio", "calibration_score", "total_outcomes"],
        lineage: [{ sourceTable: "prediction_registry", isFallback: false, isSynthetic: false }],
      },
      asOf: "2026-06-10",
      isSynthetic: false,
      isFallback: false,
    });

    render(<TrustCentrePage />);

    await screen.findByText("Data state: partially available");
    expect(screen.getAllByText("Data unavailable").length).toBeGreaterThanOrEqual(4);
    expect(screen.getByText("61.25%")).toBeTruthy();
    expect(screen.getByText("12")).toBeTruthy();
  });

  it("renders error state and no fabricated values after API failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    render(<TrustCentrePage />);

    await screen.findByText("Data state: error");
    expect(screen.getAllByText("Data unavailable").length).toBeGreaterThanOrEqual(6);
    for (const value of oldStaticValues) {
      expect(screen.queryByText(value)).toBeNull();
    }
  });

  it("renders partial response with actual asOf date and missing inputs", async () => {
    mockFetchJson({
      status: "partial",
      data: {
        alpha: 2.31,
        hit_rate: 58.33,
        sharpe_ratio: null,
        calibration_score: null,
        total_predictions: 24,
        total_outcomes: 12,
      },
      dataState: {
        availability: "partial",
        asOf: "2026-06-09T00:00:00.000Z",
        missingInputs: ["sharpe_ratio", "calibration_score"],
        lineage: [{ sourceTable: "prediction_registry", isFallback: false, isSynthetic: false }],
      },
      asOf: "2026-06-09T00:00:00.000Z",
      isSynthetic: false,
      isFallback: false,
    });

    render(<TrustCentrePage />);

    await screen.findByText("Data state: partially available");
    expect(screen.getAllByText("As of: 2026-06-09").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Missing inputs: sharpe_ratio, calibration_score")).toBeTruthy();
    expect(screen.queryByText(/Last updated: 2026-06-11/)).toBeNull();
  });

  it("renders successful response and evidence-gated validation reports", async () => {
    mockFetchJson({
      status: "ok",
      data: {
        alpha: 4.12,
        hit_rate: 64.5,
        sharpe_ratio: 1.23,
        calibration_score: 82.5,
        total_predictions: 100,
        total_outcomes: 80,
      },
      dataState: {
        availability: "available",
        asOf: "2026-06-08",
        missingInputs: [],
        lineage: [{ sourceTable: "prediction_registry", isFallback: false, isSynthetic: false }],
      },
      asOf: "2026-06-08",
      isSynthetic: false,
      isFallback: false,
    });

    render(<TrustCentrePage />);

    await screen.findByText("Data state: available");
    expect(screen.getByText("4.12%")).toBeTruthy();
    expect(screen.getByText("64.50%")).toBeTruthy();
    expect(screen.getByText("1.23")).toBeTruthy();
    expect(screen.getByText("82.50%")).toBeTruthy();
    expect(screen.getByText("100")).toBeTruthy();
    expect(screen.getByText("80")).toBeTruthy();
    expect(screen.getByText("Factor Backtest Report")).toBeTruthy();
  });

  it("does not show evidence claims when lineage is absent", async () => {
    mockFetchJson({
      status: "unavailable",
      data: null,
      dataState: {
        availability: "unavailable",
        asOf: null,
        missingInputs: ["prediction_registry"],
        lineage: [],
      },
      asOf: null,
      isSynthetic: false,
      isFallback: false,
    });

    render(<TrustCentrePage />);

    await waitFor(() => expect(screen.getByText("Data state: unavailable")).toBeTruthy());
    expect(screen.queryByText(/Every prediction/i)).toBeNull();
    expect(screen.queryByText(/auditable data/i)).toBeNull();
    expect(screen.queryByText("Factor Backtest Report")).toBeNull();
  });
});
