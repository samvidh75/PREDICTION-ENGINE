import { describe, expect, it } from "vitest";
import { healthometerLabelFromScore, normalizeHealthometerLabel, normalizeResearchStance } from "./publicLabels";

describe("public labels", () => {
  it("maps deprecated health labels to canonical public labels", () => {
    expect(normalizeHealthometerLabel("Unhealthy")).toBe("Needs review");
    expect(normalizeHealthometerLabel("Very Unhealthy")).toBe("Fragile");
  });

  it("maps deprecated research stances to canonical public labels", () => {
    expect(normalizeResearchStance("Unhealthy")).toBe("Risk rising");
    expect(normalizeResearchStance("Very Unhealthy")).toBe("Avoid for now");
  });

  it("derives Healthometer labels from finite scores", () => {
    expect(healthometerLabelFromScore(82)).toBe("Very healthy");
    expect(healthometerLabelFromScore(52)).toBe("Stable");
    expect(healthometerLabelFromScore(12)).toBe("Fragile");
    expect(healthometerLabelFromScore(null)).toBe("Not enough information");
  });
});
