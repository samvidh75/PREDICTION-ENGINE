import { describe, it, expect } from "vitest";
import { formatErrorSummary, isValidStatusTransition } from "./jobContracts";

describe("formatErrorSummary", () => {
  it("extracts first line from Error", () => {
    expect(formatErrorSummary(new Error("something broke\nat line 42"))).toBe("something broke");
  });

  it("returns plain string as-is", () => {
    expect(formatErrorSummary("disk full")).toBe("disk full");
  });

  it("strips secrets from the summary", () => {
    const scrubbed = formatErrorSummary("auth failed for key=sk-abcdef123456");
    expect(scrubbed).not.toContain("sk-abcdef123456");
    expect(scrubbed).toContain("key=***");
  });

  it("handles non-Error, non-string gracefully", () => {
    expect(formatErrorSummary(null)).toBe("Unknown error");
    expect(formatErrorSummary(undefined)).toBe("Unknown error");
    expect(formatErrorSummary({ custom: true })).toContain("[object Object]");
  });
});

describe("isValidStatusTransition", () => {
  it("allows queued → running", () => {
    expect(isValidStatusTransition("queued", "running")).toBe(true);
  });

  it("allows queued → skipped", () => {
    expect(isValidStatusTransition("queued", "skipped")).toBe(true);
  });

  it("allows running → succeeded", () => {
    expect(isValidStatusTransition("running", "succeeded")).toBe(true);
  });

  it("allows running → failed", () => {
    expect(isValidStatusTransition("running", "failed")).toBe(true);
  });

  it("allows failed → queued (retry)", () => {
    expect(isValidStatusTransition("failed", "queued")).toBe(true);
  });

  it("allows failed → running (retry)", () => {
    expect(isValidStatusTransition("failed", "running")).toBe(true);
  });

  it("disallows succeeded → running", () => {
    expect(isValidStatusTransition("succeeded", "running")).toBe(false);
  });

  it("disallows skipped → running", () => {
    expect(isValidStatusTransition("skipped", "running")).toBe(false);
  });

  it("allows null → any initial state", () => {
    for (const s of ["queued", "running", "succeeded", "failed", "skipped"]) {
      expect(isValidStatusTransition(null, s as any)).toBe(true);
    }
  });
});
