/**
 * Shared WebGPU config reader.
 *
 * GuidedOnboarding.tsx writes `webgpuEnabled` into localStorage after a
 * one-time capability check, but nothing ever read it back — it was a dead
 * flag. This is the single read-side used by any feature (currently
 * AIChatPage) that wants to offer local/offline inference via
 * LocalLLMService when the user's device supports WebGPU.
 */
const STORAGE_KEY = "ss_guided_onboarding_config_v1";

export function isWebGpuEnabledInConfig(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return Boolean(parsed?.webgpuEnabled);
  } catch {
    return false;
  }
}

/** Re-checks actual browser support — the stored flag can go stale (e.g. a
 * different browser/profile, or a driver that stopped exposing WebGPU). */
export async function detectWebGpuSupport(): Promise<boolean> {
  if (typeof navigator === "undefined" || !("gpu" in navigator)) return false;
  try {
    const adapter = await (navigator as any).gpu.requestAdapter();
    return Boolean(adapter);
  } catch {
    return false;
  }
}
