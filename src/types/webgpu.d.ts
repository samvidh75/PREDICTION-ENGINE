// src/types/webgpu.d.ts
// WebGPU API type declarations for TypeScript
// https://www.w3.org/TR/webgpu/

interface Navigator {
  gpu?: GPU;
}

interface GPU {
  requestAdapter(options?: GPURequestAdapterOptions): Promise<GPUAdapter | null>;
}

interface GPURequestAdapterOptions {
  powerPreference?: "low-power" | "high-performance";
  forceFallbackAdapter?: boolean;
}

interface GPUAdapter {
  requestDevice(descriptor?: GPUDeviceDescriptor): Promise<GPUDevice>;
}

interface GPUDeviceDescriptor {
  requiredFeatures?: GPUFeatureName[];
  requiredLimits?: Record<string, number>;
}

type GPUFeatureName = string;

interface GPUDevice extends EventTarget {
  createBuffer(descriptor: GPUBufferDescriptor): GPUBuffer;
  createShaderModule(descriptor: GPUShaderModuleDescriptor): GPUShaderModule;
  createComputePipeline(descriptor: GPUComputePipelineDescriptor): GPUComputePipeline;
  createBindGroup(descriptor: GPUBindGroupDescriptor): GPUBindGroup;
  createCommandEncoder(descriptor?: GPUCommandEncoderDescriptor): GPUCommandEncoder;
  queue: GPUQueue;
  destroy(): void;
}

interface GPUBufferDescriptor {
  size: number;
  usage: GPUBufferUsageFlags;
  mappedAtCreation?: boolean;
}

type GPUBufferUsageFlags = number;

interface GPUBuffer {
  getMappedRange(): ArrayBuffer;
  mapAsync(mode: GPUMapMode): Promise<void>;
  unmap(): void;
  destroy(): void;
}

interface GPUShaderModuleDescriptor {
  code: string;
}

/* eslint-disable @typescript-eslint/no-empty-object-type */

 
interface GPUShaderModule {}

interface GPUComputePipelineDescriptor {
  layout: GPUPipelineLayout | "auto";
  compute: GPUProgrammableStage;
}

interface GPUPipelineLayout {}

interface GPUProgrammableStage {
  module: GPUShaderModule;
  entryPoint: string;
}

interface GPUComputePipeline {
  getBindGroupLayout(index: number): GPUBindGroupLayout;
}

interface GPUBindGroupDescriptor {
  layout: GPUBindGroupLayout;
  entries: GPUBindGroupEntry[];
}

interface GPUBindGroupLayout {
  (binding: number): GPUBindGroupLayoutEntry;
}

interface GPUBindGroupEntry {
  binding: number;
  resource: GPUBufferBinding | GPUShaderModule;
}

interface GPUBufferBinding {
  buffer: GPUBuffer;
  offset?: number;
  size?: number;
}

interface GPUBindGroup {}

interface GPUCommandEncoderDescriptor {}

interface GPUCommandEncoder {
  beginComputePass(descriptor?: GPUComputePassDescriptor): GPUComputePassEncoder;
  finish(): GPUCommandBuffer;
}

interface GPUComputePassDescriptor {}

interface GPUComputePassEncoder {
  setPipeline(pipeline: GPUComputePipeline): void;
  setBindGroup(index: number, bindGroup: GPUBindGroup): void;
  dispatchWorkgroups(x: number, y?: number, z?: number): void;
  end(): void;
}

interface GPUCommandBuffer {}

interface GPUQueue {
  submit(commands: GPUCommandBuffer[]): void;
}

type GPUMapMode = number;

declare const GPUMapMode: {
  readonly READ: GPUMapMode;
};

interface GPUBufferUsage {
  STORAGE: 256;
  COPY_SRC: 4;
  COPY_DST: 8;
  MAP_READ: 1;
  MAP_WRITE: 2;
}

declare const GPUBufferUsage: GPUBufferUsage;
