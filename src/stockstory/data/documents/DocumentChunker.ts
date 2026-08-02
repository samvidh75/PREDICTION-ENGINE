/**
 * Document Chunker
 *
 * Splits parsed document text into configurable segments for
 * downstream processing, embedding, and retrieval.
 *
 * Supports configurable chunk size and overlap.
 * No copyrighted content is stored — only text from disclosed filings.
 */

export interface ChunkResult {
  chunks: DocumentChunk[];
  metadata: {
    totalChunks: number;
    averageChunkSize: number;
    originalLength: number;
  };
}

export interface DocumentChunk {
  index: number;
  text: string;
  startOffset: number;
  endOffset: number;
  size: number;
}

export interface ChunkerConfig {
  size: number; // Target chunk size in characters
  overlap: number; // Overlap between consecutive chunks in characters
}

export const DEFAULT_CHUNKER_CONFIG: ChunkerConfig = {
  size: 2000,
  overlap: 200,
};

export class DocumentChunker {
  private config: ChunkerConfig;

  constructor(config: Partial<ChunkerConfig> = {}) {
    this.config = {
      size: config.size ?? DEFAULT_CHUNKER_CONFIG.size,
      overlap: config.overlap ?? DEFAULT_CHUNKER_CONFIG.overlap,
    };

    // Validate config
    if (this.config.overlap >= this.config.size) {
      this.config.overlap = Math.floor(this.config.size / 2);
    }
    if (this.config.size < 100) {
      this.config.size = 100;
    }
    if (this.config.overlap < 0) {
      this.config.overlap = 0;
    }
  }

  /**
   * Update chunker configuration.
   */
  configure(config: Partial<ChunkerConfig>): void {
    if (config.size !== undefined) this.config.size = config.size;
    if (config.overlap !== undefined) this.config.overlap = config.overlap;
  }

  /**
   * Chunk text into segments with configurable size and overlap.
   * @param text The input text to chunk
   * @returns ChunkResult with chunks and metadata
   */
  chunk(text: string): ChunkResult {
    if (!text || text.trim().length === 0) {
      return {
        chunks: [],
        metadata: {
          totalChunks: 0,
          averageChunkSize: 0,
          originalLength: 0,
        },
      };
    }

    const { size, overlap } = this.config;
    const chunks: DocumentChunk[] = [];
    const step = size - overlap;
    let index = 0;

    for (let offset = 0; offset < text.length; offset += step) {
      const endOffset = Math.min(offset + size, text.length);
      const chunkText = text.slice(offset, endOffset);

      // Skip empty chunks
      if (chunkText.trim().length === 0) continue;

      chunks.push({
        index,
        text: chunkText,
        startOffset: offset,
        endOffset,
        size: chunkText.length,
      });

      index++;

      // Prevent infinite loop on very small step values
      if (step <= 0) break;
    }

    const totalSize = chunks.reduce((sum, c) => sum + c.size, 0);
    const averageChunkSize = chunks.length > 0 ? Math.round(totalSize / chunks.length) : 0;

    return {
      chunks,
      metadata: {
        totalChunks: chunks.length,
        averageChunkSize,
        originalLength: text.length,
      },
    };
  }

  /**
   * Get current chunker configuration.
   */
  getConfig(): ChunkerConfig {
    return { ...this.config };
  }
}

export const documentChunker = new DocumentChunker();