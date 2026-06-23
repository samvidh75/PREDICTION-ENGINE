import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import HealthometerPanel from "../HealthometerPanel";

describe("HealthometerPanel", () => {
  it("renders loading state", () => {
    const { container } = render(<HealthometerPanel label={null} score={null} dimensions={[]} loading />);
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
  });

  it("shows empty state when no data", () => {
    render(<HealthometerPanel label={null} score={null} dimensions={[]} />);
    expect(screen.getByText(/not enough information/i)).toBeTruthy();
  });

  it("renders dimensions with scores", () => {
    render(
      <HealthometerPanel
        label="Strong"
        score={75}
        dimensions={[
          { id: "quality", label: "Quality", score: 80 },
          { id: "growth", label: "Growth", score: 70 },
        ]}
      />,
    );
    expect(screen.getByText("75")).toBeTruthy();
    expect(screen.getByText("Quality")).toBeTruthy();
    expect(screen.getByText("Growth")).toBeTruthy();
    expect(screen.getByText("80")).toBeTruthy();
    expect(screen.getByText("70")).toBeTruthy();
  });

  it("handles partial dimensions (some null)", () => {
    render(
      <HealthometerPanel
        label="Partial"
        score={null}
        dimensions={[
          { id: "quality", label: "Quality", score: 80 },
          { id: "risk", label: "Risk", score: null },
        ]}
      />,
    );
    expect(screen.getByText("Quality")).toBeTruthy();
    expect(screen.getByText("Risk")).toBeTruthy();
    expect(screen.getByText("—")).toBeTruthy();
  });

  it("has no NaN or undefined displayed", () => {
    const { container } = render(
      <HealthometerPanel
        label={null}
        score={NaN}
        dimensions={[{ id: "quality", label: "Quality", score: NaN }]}
      />,
    );
    expect(container.textContent).not.toContain("NaN");
    expect(container.textContent).not.toContain("undefined");
  });
});
