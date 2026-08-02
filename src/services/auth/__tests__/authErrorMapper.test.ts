import { describe, it, expect } from "vitest";
import { mapAuthError } from "../authErrorMapper";

describe("mapAuthError", () => {
  it("returns default message for null/undefined", () => {
    expect(mapAuthError(null)).toBe(
      "Authentication is unavailable right now. Please try again later or contact support.",
    );
    expect(mapAuthError(undefined)).toBe(
      "Authentication is unavailable right now. Please try again later or contact support.",
    );
  });

  it("returns default message for non-object", () => {
    expect(mapAuthError("string")).toBe(
      "Authentication is unavailable right now. Please try again later or contact support.",
    );
    expect(mapAuthError(42)).toBe(
      "Authentication is unavailable right now. Please try again later or contact support.",
    );
  });

  it("maps auth/unauthorized-domain", () => {
    expect(mapAuthError({ code: "auth/unauthorized-domain" })).toBe(
      "Login is not enabled for this domain yet. Please contact support.",
    );
  });

  it("maps auth/popup-closed-by-user", () => {
    expect(mapAuthError({ code: "auth/popup-closed-by-user" })).toBe(
      "The Google sign-in popup was closed before completion. Please try again.",
    );
  });

  it("maps auth/network-request-failed", () => {
    expect(mapAuthError({ code: "auth/network-request-failed" })).toBe(
      "A network error interrupted sign-in. Please check your connection and try again.",
    );
  });

  it("maps auth/user-disabled", () => {
    expect(mapAuthError({ code: "auth/user-disabled" })).toBe(
      "This account has been disabled. Please contact support.",
    );
  });

  it("maps auth/invalid-credential", () => {
    expect(mapAuthError({ code: "auth/invalid-credential" })).toBe(
      "The credentials provided are invalid. Please check your email and password.",
    );
  });

  it("maps auth/email-already-in-use", () => {
    expect(mapAuthError({ code: "auth/email-already-in-use" })).toBe(
      "An account already exists with this email. Please sign in or reset your password.",
    );
  });

  it("maps auth/weak-password", () => {
    expect(mapAuthError({ code: "auth/weak-password" })).toBe(
      "Password must be at least 6 characters.",
    );
  });

  it("maps auth/missing-name", () => {
    expect(mapAuthError({ code: "auth/missing-name" })).toBe(
      "Please enter your name.",
    );
  });

  it("maps auth/account-exists-with-different-credential", () => {
    expect(mapAuthError({ code: "auth/account-exists-with-different-credential" })).toBe(
      "An account already exists with this email address under a different sign-in method.",
    );
  });

  it("maps auth/wrong-password", () => {
    expect(mapAuthError({ code: "auth/wrong-password" })).toBe(
      "The password is incorrect. Please try again.",
    );
  });

  it("maps auth/user-not-found", () => {
    expect(mapAuthError({ code: "auth/user-not-found" })).toBe(
      "No account was found for this email. Please check and try again.",
    );
  });

  it("maps auth/invalid-email", () => {
    expect(mapAuthError({ code: "auth/invalid-email" })).toBe(
      "Please enter a valid email address.",
    );
  });

  it("maps auth/too-many-requests", () => {
    expect(mapAuthError({ code: "auth/too-many-requests" })).toBe(
      "Too many attempts. Please wait briefly and try again.",
    );
  });

  it("maps auth/popup-blocked", () => {
    expect(mapAuthError({ code: "auth/popup-blocked" })).toBe(
      "Sign-in was blocked by the browser. Please allow pop-ups and try again.",
    );
  });

  it("maps auth/operation-not-allowed", () => {
    expect(mapAuthError({ code: "auth/operation-not-allowed" })).toBe(
      "This sign-in method is not enabled for this deployment. Please contact support.",
    );
  });

  it("maps auth config errors to config message", () => {
    const configErrors = [
      "auth/invalid-api-key",
      "auth/app-not-authorized",
      "auth/missing-api-key",
      "auth/invalid-app-credential",
    ];
    for (const code of configErrors) {
      expect(mapAuthError({ code })).toBe(
        "Authentication is not configured for this deployment. Please contact support.",
      );
    }
  });

  it("maps auth/missing-email", () => {
    expect(mapAuthError({ code: "auth/missing-email" })).toBe(
      "Please enter your email address.",
    );
  });

  it("maps auth/id-token-expired and session-expired", () => {
    expect(mapAuthError({ code: "auth/id-token-expired" })).toBe(
      "Your session has expired. Please sign in again.",
    );
    expect(mapAuthError({ code: "auth/session-expired" })).toBe(
      "Your session has expired. Please sign in again.",
    );
  });

  it("falls back on message content when code is absent", () => {
    expect(mapAuthError({ message: "auth/popup-closed-by-user" })).toBe(
      "The Google sign-in popup was closed before completion. Please try again.",
    );
    expect(mapAuthError({ message: "auth/invalid-credential" })).toBe(
      "The credentials provided are invalid. Please check your email and password.",
    );
    expect(mapAuthError({ message: "unauthorized-domain" })).toBe(
      "Login is not enabled for this domain yet. Please contact support.",
    );
  });

  it("falls back to config message for Firebase keyword in message", () => {
    expect(mapAuthError({ message: "Firebase error: something" })).toBe(
      "Authentication is not configured for this deployment. Please contact support.",
    );
    expect(mapAuthError({ message: "API key is invalid" })).toBe(
      "Authentication is not configured for this deployment. Please contact support.",
    );
    expect(mapAuthError({ message: "not configured" })).toBe(
      "Authentication is not configured for this deployment. Please contact support.",
    );
  });

  it("falls back to network message for fetch errors", () => {
    expect(mapAuthError({ message: "Failed to fetch" })).toBe(
      "A network error interrupted sign-in. Please check your connection and try again.",
    );
    expect(mapAuthError({ message: "NetworkError" })).toBe(
      "A network error interrupted sign-in. Please check your connection and try again.",
    );
    expect(mapAuthError({ message: "ERR_NETWORK" })).toBe(
      "A network error interrupted sign-in. Please check your connection and try again.",
    );
  });

  it("returns default for unknown errors", () => {
    expect(mapAuthError({ code: "auth/unknown-code" })).toBe(
      "Authentication is unavailable right now. Please try again later or contact support.",
    );
    expect(mapAuthError({ message: "something unexpected" })).toBe(
      "Authentication is unavailable right now. Please try again later or contact support.",
    );
    expect(mapAuthError({})).toBe(
      "Authentication is unavailable right now. Please try again later or contact support.",
    );
  });

  it("never includes raw error codes in output", () => {
    const result = mapAuthError({ code: "auth/invalid-api-key", message: "API key not valid" });
    expect(result).not.toContain("auth/");
    expect(result).not.toContain("API key");
  });
});
