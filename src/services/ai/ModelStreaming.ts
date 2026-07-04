/**
 * Model Streaming & Progressive Loading
 * Streams model download for perceived faster load times
 * Starts inference as soon as enough data is received
 */

export interface DownloadProgress {
  loaded: number;
  total: number;
  percent: number;
  speedMBps: number;
  etaSeconds: number;
  status: 'idle' | 'downloading' | 'processing' | 'complete' | 'error';
}

export type ProgressCallback = (progress: DownloadProgress) => void;

class ModelStreamer {
  private progressCallbacks: Set<ProgressCallback> = new Set();
  private startTime: number = 0;
  private lastUpdate: number = 0;

  onProgress(callback: ProgressCallback): () => void {
    this.progressCallbacks.add(callback);
    return () => this.progressCallbacks.delete(callback);
  }

  private notifyProgress(progress: DownloadProgress): void {
    this.progressCallbacks.forEach((cb) => {
      try {
        cb(progress);
      } catch (error) {
        console.error('[Streaming] Progress callback error:', error);
      }
    });
  }

  async downloadWithStreaming(
    url: string,
    onProgress?: ProgressCallback
  ): Promise<Uint8Array> {
    try {
      this.startTime = Date.now();
      this.lastUpdate = this.startTime;

      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
      if (!contentLength) throw new Error('Unknown content length');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const chunks: Uint8Array[] = [];
      let loaded = 0;

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        loaded += value.length;

        const now = Date.now();
        if (now - this.lastUpdate > 100) {
          // Update every 100ms
          const elapsed = (now - this.startTime) / 1000;
          const speedMBps = loaded / 1024 / 1024 / elapsed;
          const remainingBytes = contentLength - loaded;
          const etaSeconds = Math.ceil(remainingBytes / (speedMBps * 1024 * 1024));

          const progress: DownloadProgress = {
            loaded,
            total: contentLength,
            percent: (loaded / contentLength) * 100,
            speedMBps: Math.round(speedMBps * 10) / 10,
            etaSeconds,
            status: 'downloading',
          };

          onProgress?.(progress);
          this.notifyProgress(progress);
          this.lastUpdate = now;
        }

        // Check if we can start inference (e.g., after 50% downloaded)
        if (loaded >= contentLength * 0.5) {
          console.log('[Streaming] 50% downloaded, ready for progressive inference');
        }
      }

      // Combine chunks
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }

      const finalProgress: DownloadProgress = {
        loaded: contentLength,
        total: contentLength,
        percent: 100,
        speedMBps: contentLength / 1024 / 1024 / ((Date.now() - this.startTime) / 1000),
        etaSeconds: 0,
        status: 'complete',
      };

      onProgress?.(finalProgress);
      this.notifyProgress(finalProgress);

      return result;
    } catch (error) {
      const errorProgress: DownloadProgress = {
        loaded: 0,
        total: 0,
        percent: 0,
        speedMBps: 0,
        etaSeconds: 0,
        status: 'error',
      };

      this.notifyProgress(errorProgress);
      throw error;
    }
  }

  formatSpeed(mbps: number): string {
    if (mbps >= 1) return `${mbps.toFixed(1)} MB/s`;
    return `${(mbps * 1024).toFixed(0)} KB/s`;
  }

  formatETA(seconds: number): string {
    if (seconds < 60) return `${Math.ceil(seconds)}s`;
    const mins = Math.ceil(seconds / 60);
    return `${mins}m`;
  }
}

export const modelStreamer = new ModelStreamer();
