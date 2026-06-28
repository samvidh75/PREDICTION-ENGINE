/**
 * Document Parser
 *
 * Parses raw document content into structured text and metadata.
 * Handles potential failures gracefully — returns null for unparseable content.
 *
 * This parser does NOT:
 * - Make legal or materiality judgments about content
 * - Parse copyrighted third-party research
 * - Execute embedded scripts or fetch external resources
 */

export interface ParsedDocument {
  text: string;
  metadata: {
    originalLength: number;
    parsedLength: number;
    language: string;
    detectedEncoding?: string;
    hasImages?: boolean;
    pageCount?: number;
    parseErrors?: string[];
  };
}

export class DocumentParser {
  /**
   * Parse a raw document string into structured text and metadata.
   * @param content Raw string content from a document file
   * @param mimeType Optional MIME type hint (e.g., 'text/plain', 'application/pdf')
   * @returns ParsedDocument or null if parsing fails
   */
  parse(content: string, mimeType?: string): ParsedDocument | null {
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return null;
    }

    try {
      // Detect if content is binary (simple heuristic)
      if (this.isBinaryContent(content)) {
        const textContent = this.extractTextFromBinary(content);
        if (!textContent || textContent.trim().length < 10) {
          return this.failureResult('Binary content could not be decoded to text', content);
        }
        return this.successResult(textContent, content);
      }

      // For text content, clean and normalize
      const text = this.normalizeText(content);
      if (text.trim().length === 0) {
        return this.failureResult('No extractable text found', content);
      }

      return this.successResult(text, content);
    } catch (error) {
      // Gracefully handle unexpected parsing errors
      const errorMessage = error instanceof Error ? error.message : 'Unknown parse error';
      return this.failureResult(errorMessage, content);
    }
  }

  /**
   * Attempt to extract text from binary content.
   * Placeholder for future implementation with PDF/Office parsing.
   */
  private extractTextFromBinary(_content: string): string | null {
    // Future: integrate with PDF parser, Office parser, etc.
    // For now, return null to indicate binary content is not supported
    return null;
  }

  /**
   * Check if content appears to be binary (non-UTF-8 text).
   */
  private isBinaryContent(content: string): boolean {
    // Check for null bytes or high density of non-ASCII characters
    let nonTextCount = 0;
    const sampleSize = Math.min(content.length, 1024);
    for (let i = 0; i < sampleSize; i++) {
      const code = content.charCodeAt(i);
      // Control characters (except common ones like tab, newline, carriage return)
      if ((code < 32 && code !== 9 && code !== 10 && code !== 13) || code === 65533) {
        nonTextCount++;
      }
    }
    return nonTextCount > sampleSize * 0.1; // >10% suspicious characters
  }

  /**
   * Normalize text: remove excessive whitespace, normalize line endings.
   */
  private normalizeText(content: string): string {
    return content
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\r/g, '\n')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '') // Remove control chars
      .replace(/\t/g, ' ') // Replace tabs with spaces
      .replace(/  +/g, ' ') // Collapse multiple spaces
      .replace(/\n{3,}/g, '\n\n') // Collapse excessive blank lines
      .trim();
  }

  /**
   * Build a successful parse result.
   */
  private successResult(text: string, original: string): ParsedDocument {
    return {
      text,
      metadata: {
        originalLength: original.length,
        parsedLength: text.length,
        language: this.detectLanguage(text),
        hasImages: false,
        pageCount: undefined,
      },
    };
  }

  /**
   * Build a failure result with error message.
   */
  private failureResult(error: string, original: string): ParsedDocument {
    return {
      text: '',
      metadata: {
        originalLength: original.length,
        parsedLength: 0,
        language: 'unknown',
        parseErrors: [error],
      },
    };
  }

  /**
   * Basic language detection placeholder.
   * Future: replace with proper language detection library.
   */
  private detectLanguage(_text: string): string {
    // Placeholder — returns 'en' as default
    return 'en';
  }
}

export const documentParser = new DocumentParser();