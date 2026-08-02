export interface DeviceAiCapability {
  canUseBrowserLocalAi: boolean;
  canUseWorker: boolean;
  reason: "supported" | "no_browser" | "no_worker" | "no_webgpu" | "unknown";
}

export function detectDeviceAiCapability(): DeviceAiCapability {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {
      canUseBrowserLocalAi: false,
      canUseWorker: false,
      reason: "no_browser",
    };
  }

  const hasWorker = typeof Worker !== "undefined";
  if (!hasWorker) {
    return {
      canUseBrowserLocalAi: false,
      canUseWorker: false,
      reason: "no_worker",
    };
  }

  const hasWebGpu = typeof navigator === "object" && "gpu" in navigator;
  if (!hasWebGpu) {
    return {
      canUseBrowserLocalAi: false,
      canUseWorker: true,
      reason: "no_webgpu",
    };
  }

  return {
    canUseBrowserLocalAi: true,
    canUseWorker: true,
    reason: "supported",
  };
}
