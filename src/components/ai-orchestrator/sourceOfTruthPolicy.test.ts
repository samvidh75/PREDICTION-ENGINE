import { describe, expect, it } from "vitest";
import {
  canLocalAiComputeOfficialScores,
  isOfficialStockStorySourceOfTruth,
  STOCKSTORY_SOURCE_OF_TRUTH_POLICY,
} from "./sourceOfTruthPolicy";

describe("sourceOfTruthPolicy", () => {
  it("forbids local AI official scoring", () => {
    expect(canLocalAiComputeOfficialScores()).toBe(false);
    expect(STOCKSTORY_SOURCE_OF_TRUTH_POLICY.localAiCanComputeOfficialScores).toBe(false);
  });

  it("accepts only deterministic official sources", () => {
    expect(isOfficialStockStorySourceOfTruth("healthometer")).toBe(true);
    expect(isOfficialStockStorySourceOfTruth("browser_local")).toBe(false);
  });

  it("treats the policy constants as readonly", () => {
    expect(Object.isFrozen(STOCKSTORY_SOURCE_OF_TRUTH_POLICY)).toBe(true);
  });
});
