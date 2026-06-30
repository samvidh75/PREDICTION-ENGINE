import { describe, expect, it } from "vitest";
import { detectDeviceAiCapability } from "./deviceAiCapability";

describe("deviceAiCapability", () => {
  it("does not throw in SSR or tests", () => {
    expect(() => detectDeviceAiCapability()).not.toThrow();
    expect(detectDeviceAiCapability().reason).toBeTypeOf("string");
  });
});
