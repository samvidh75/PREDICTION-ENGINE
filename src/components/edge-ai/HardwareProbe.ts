export type DeviceComputeTier = 'ELITE_GPU_OFFLOAD' | 'STANDARD_WASM_EDGE' | 'LEGACY_SERVER_FALLBACK';

export class HardwareProbe {
  public static async evaluateDevicePerformance(): Promise<DeviceComputeTier> {
    if (!navigator.gpu) {
      return this.checkCpuMemoryFallback();
    }

    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) return this.checkCpuMemoryFallback();

      const info: any = await (adapter as any).requestAdapterInfo();
      const gpuName = (info.device || info.description || '').toLowerCase();

      const isMobileGpu = gpuName.includes('apple') || gpuName.includes('mali') || gpuName.includes('adreno');
      const isLowEndGpu = gpuName.includes('intel') && !gpuName.includes('arc');

      if (isMobileGpu || isLowEndGpu) {
        return 'STANDARD_WASM_EDGE';
      }

      return 'ELITE_GPU_OFFLOAD';
    } catch {
      return this.checkCpuMemoryFallback();
    }
  }

  private static checkCpuMemoryFallback(): DeviceComputeTier {
    const logicalCores = navigator.hardwareConcurrency || 4;
    const approximateRam = (navigator as any).deviceMemory || 4;

    if (logicalCores >= 8 && approximateRam >= 8) {
      return 'STANDARD_WASM_EDGE';
    }
    return 'LEGACY_SERVER_FALLBACK';
  }
}
