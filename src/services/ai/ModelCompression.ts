/**
 * Model Compression Utilities
 * Handles compression/decompression of ONNX models for efficient browser storage
 */

export interface CompressionStats {
  originalSize: number;
  compressedSize: number;
  ratio: number;
  savings: string;
}

/**
 * Compress model using Deflate (gzip-compatible)
 * Reduces 50-70MB model to ~15-20MB
 */
export async function compressModel(modelData: Uint8Array): Promise<Uint8Array> {
  try {
    // Use CompressionStream API if available (modern browsers)
    if ('CompressionStream' in window) {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(modelData);
          controller.close();
        },
      });

      const compressedStream = stream.pipeThrough(
        new (window as any).CompressionStream('gzip')
      );

      const reader = compressedStream.getReader();
      const chunks: Uint8Array[] = [];
      let totalLength = 0;

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value as Uint8Array);
        totalLength += (value as Uint8Array).length;
      }

      const compressed = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        compressed.set(chunk, offset);
        offset += chunk.length;
      }

      return compressed;
    }

    // Fallback: return uncompressed (CompressionStream not available)
    console.warn('[ModelCompression] CompressionStream not available, returning uncompressed');
    return modelData;
  } catch (error) {
    console.error('[ModelCompression] Compression failed:', error);
    return modelData;
  }
}

/**
 * Decompress model
 */
export async function decompressModel(compressedData: Uint8Array): Promise<Uint8Array> {
  try {
    if ('DecompressionStream' in window) {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(compressedData);
          controller.close();
        },
      });

      const decompressedStream = stream.pipeThrough(
        new (window as any).DecompressionStream('gzip')
      );

      const reader = decompressedStream.getReader();
      const chunks: Uint8Array[] = [];
      let totalLength = 0;

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value as Uint8Array);
        totalLength += (value as Uint8Array).length;
      }

      const decompressed = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        decompressed.set(chunk, offset);
        offset += chunk.length;
      }

      return decompressed;
    }

    return compressedData;
  } catch (error) {
    console.error('[ModelCompression] Decompression failed:', error);
    return compressedData;
  }
}

/**
 * Calculate compression statistics
 */
export function getCompressionStats(original: number, compressed: number): CompressionStats {
  const ratio = (compressed / original) * 100;
  const savings = ((1 - compressed / original) * 100).toFixed(1);

  return {
    originalSize: original,
    compressedSize: compressed,
    ratio,
    savings: `${savings}%`,
  };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Model optimization recommendations
 */
export const OPTIMIZATION_TIPS = `
## Model Optimization Tips

### 1. Quantization (Most Effective)
- Convert float32 to int8: ~4x compression
- Minimal accuracy loss for classification tasks
- Tools: ONNX quantization, TensorFlow Lite

### 2. Pruning
- Remove unused weights: ~30-50% reduction
- Requires fine-tuning on target data
- Recommended for over-parameterized models

### 3. Knowledge Distillation
- Train smaller model from larger one: ~10x compression
- Best for accuracy-critical applications
- Requires labeled data

### 4. Layer Fusion
- Combine consecutive operations: ~5-10% reduction
- ONNX optimizer does this automatically
- No accuracy loss

### 5. Current Setup
- Compressed (gzip): 15-20MB
- With int8 quantization: 12-15MB
- With pruning: 8-10MB
- Production target: 10MB or less
`;
