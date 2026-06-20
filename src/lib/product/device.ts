export type DeviceTier = "mobile" | "largeMobile" | "tablet" | "laptop" | "desktop" | "wide";

export function getDeviceTier(width: number): DeviceTier {
  if (width < 390) return "mobile";
  if (width < 640) return "largeMobile";
  if (width < 1024) return "tablet";
  if (width < 1440) return "laptop";
  if (width < 1800) return "desktop";
  return "wide";
}

export function isTouchLike(): boolean {
  if (typeof window === "undefined") return false;
  // Use pointer queries if supported, fallback to maxTouchPoints
  return window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
}
