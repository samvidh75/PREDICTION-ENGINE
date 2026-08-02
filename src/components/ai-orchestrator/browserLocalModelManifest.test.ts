import { describe, expect, it } from "vitest";
import { getBrowserLocalModelConfig } from "./browserLocalModelManifest";

describe("browserLocalModelManifest", () => {
  it("returns a disabled config when Worker is undefined", () => {
    // Vitest runs in Node — Worker should be undefined or polyfilled
    const config = getBrowserLocalModelConfig();
    // In a test environment without Worker, expect disabled
    if (typeof Worker === "undefined") {
      expect(config.profile).toBe("disabled");
      expect(config.modelId).toBe("");
      expect(config.maxInputChars).toBe(0);
      expect(config.maxOutputTokens).toBe(0);
      expect(config.temperature).toBe(0);
      expect(config.timeoutMs).toBe(0);
    }
  });

  it("returns a valid config object with all required fields", () => {
    const config = getBrowserLocalModelConfig();
    expect(config).toHaveProperty("profile");
    expect(config).toHaveProperty("modelId");
    expect(config).toHaveProperty("displayNameForInternalReports");
    expect(config).toHaveProperty("maxInputChars");
    expect(config).toHaveProperty("maxOutputTokens");
    expect(config).toHaveProperty("temperature");
    expect(config).toHaveProperty("timeoutMs");
  });

  it("profile is either disabled or small-chat", () => {
    const config = getBrowserLocalModelConfig();
    expect(["disabled", "small-chat"]).toContain(config.profile);
  });

  it("disabled config has empty modelId", () => {
    const config = getBrowserLocalModelConfig();
    if (config.profile === "disabled") {
      expect(config.modelId).toBe("");
    }
  });

  it("small-chat config has a non-empty modelId", () => {
    const config = getBrowserLocalModelConfig();
    if (config.profile === "small-chat") {
      expect(config.modelId.length).toBeGreaterThan(0);
      expect(config.maxInputChars).toBeGreaterThan(0);
      expect(config.maxOutputTokens).toBeGreaterThan(0);
      expect(config.timeoutMs).toBeGreaterThan(0);
    }
  });
});
