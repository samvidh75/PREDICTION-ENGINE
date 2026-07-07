/**
 * Document Metadata Extractor
 *
 * Extracts structured metadata from document text, including:
 * - symbol, companyName, documentType, period, fiscalYear,
 *   publishedDate, language, checksum
 *
 * Uses deterministic hashing (stableHash) for checksum generation.
 * No external APIs or proprietary data sources are used.
 */

import { stableHash } from '../../utils/hash';

export interface DocumentMetadata {
  symbol: string;
  companyName: string;
  documentType: string;
  period: string | null;
  fiscalYear: number | null;
  publishedDate: string | null;
  language: string;
  checksum: string;
}

export interface ExtractionResult {
  metadata: DocumentMetadata;
  confidence: number; // 0-1 indicating extraction confidence
  warnings: string[];
}

export class DocumentMetadataExtractor {
  /**
   * Extract metadata from parsed document text.
   * @param text The parsed document text
   * @param filename Optional filename for additional hints
   * @returns ExtractionResult with metadata, confidence, and warnings
   */
  extract(text: string, filename?: string): ExtractionResult {
    const warnings: string[] = [];
    const lines = text.split('\n').slice(0, 100); // Scan first 100 lines for metadata

    // Extract symbol — look for patterns like "Symbol: RELIANCE", "RELIANCE", "[PSE:500325]"
    const symbol = this.extractSymbol(lines, filename) ?? 'UNKNOWN';

    // Extract company name — look for header or "Company Name:" pattern
    const companyName = this.extractCompanyName(lines, symbol) ?? 'Unknown Company';

    // Extract document type — classify based on content patterns
    const documentType = this.extractDocumentType(lines, filename);

    // Extract period — look for "Period: Q1FY24", "FY24", etc.
    const period = this.extractPeriod(lines);

    // Extract fiscal year from period or content
    const fiscalYear = this.extractFiscalYear(lines, period);

    // Extract published date
    const publishedDate = this.extractPublishedDate(lines);

    // Detect language
    const language = this.extractLanguage(text);

    // Compute checksum using stableHash
    const checksum = stableHash(text);

    // Calculate confidence
    let confidence = 0.5;
    if (symbol !== 'UNKNOWN') confidence += 0.2;
    if (companyName !== 'Unknown Company') confidence += 0.1;
    if (documentType !== 'unknown') confidence += 0.1;
    if (period !== null) confidence += 0.05;
    if (publishedDate !== null) confidence += 0.05;
    confidence = Math.min(confidence, 1);

    return {
      metadata: {
        symbol,
        companyName,
        documentType,
        period,
        fiscalYear,
        publishedDate,
        language,
        checksum,
      },
      confidence,
      warnings,
    };
  }

  /**
   * Extract stock symbol from text lines or filename.
   */
  private extractSymbol(lines: string[], filename?: string): string | null {
    // Try filename first
    if (filename) {
      const match = filename.match(/^([A-Z]+)[_\-\s]/);
      if (match) return match[1];
    }

    // Try common patterns
    for (const line of lines) {
      const clean = line.trim();
      // Pattern: "Symbol: RELIANCE"
      const symMatch = clean.match(/Symbol[:\s]+([A-Z]{2,10})/i);
      if (symMatch) return symMatch[1].toUpperCase();
      // Pattern: "PSE:500325" or "PSE:RELIANCE"
      const bseMatch = clean.match(/(?:PSE|PSE)[:\s]*([A-Z0-9]+)/i);
      if (bseMatch) return bseMatch[1].toUpperCase();
    }

    return null;
  }

  /**
   * Extract company name from text.
   */
  private extractCompanyName(lines: string[], _symbol: string): string | null {
    for (const line of lines) {
      const clean = line.trim();
      if (clean.startsWith('Company Name:') || clean.startsWith('Company:')) {
        return clean.split(/:\s*/).slice(1).join(': ').trim();
      }
    }
    return null;
  }

  /**
   * Extract document type from content.
   */
  private extractDocumentType(lines: string[], filename?: string): string {
    // Try filename first
    if (filename) {
      if (filename.toLowerCase().includes('annual') || filename.toLowerCase().includes('annual_report')) return 'annual_report';
      if (filename.toLowerCase().includes('quarterly') || filename.toLowerCase().includes('result')) return 'quarterly_result';
      if (filename.toLowerCase().includes('shareholding')) return 'shareholding';
      if (filename.toLowerCase().includes('transcript')) return 'transcript';
      if (filename.toLowerCase().includes('presentation')) return 'presentation';
      if (filename.toLowerCase().includes('filing')) return 'exchange_filing';
    }

    const textSample = lines.join(' ').toLowerCase();
    if (textSample.includes('annual report') || textSample.includes('annual report')) return 'annual_report';
    if (textSample.includes('quarterly') && (textSample.includes('result') || textSample.includes('performance'))) return 'quarterly_result';
    if (textSample.includes('shareholding pattern') || textSample.includes('shareholding')) return 'shareholding';
    if (textSample.includes('transcript') || textSample.includes('conference call')) return 'transcript';
    if (textSample.includes('presentation') || textSample.includes('investor presentation')) return 'presentation';
    if (textSample.includes('audited') || textSample.includes('financial results')) return 'quarterly_result';

    return 'unknown';
  }

  /**
   * Extract period (e.g., Q1FY24) from text.
   */
  private extractPeriod(lines: string[]): string | null {
    for (const line of lines) {
      const clean = line.trim();
      // Pattern: "Q1 FY24", "Q1FY24", "Quarter ended June 2024"
      const qMatch = clean.match(/(Q[1-4])\s*(FY?\d{2,4})/i);
      if (qMatch) return `${qMatch[1].toUpperCase()}${qMatch[2].toUpperCase().replace(/\s+/g, '')}`;
      // Pattern: "Period: Q1FY24"
      const pMatch = clean.match(/Period[:\s]+(\S+)/i);
      if (pMatch) return pMatch[1];
    }
    return null;
  }

  /**
   * Extract fiscal year from text or period.
   */
  private extractFiscalYear(lines: string[], period: string | null): number | null {
    // Try from period first
    if (period) {
      const fyMatch = period.match(/FY(\d{2,4})/i);
      if (fyMatch) {
        const yearNum = parseInt(fyMatch[1], 10);
        if (yearNum < 100) return 2000 + yearNum;
        return yearNum;
      }
    }

    // Search for "Fiscal Year: 2024" or "FY2024"
    for (const line of lines) {
      const clean = line.trim();
      const fyMatch = clean.match(/Fiscal\s*Year[:\s]*(\d{4})/i);
      if (fyMatch) return parseInt(fyMatch[1], 10);
    }

    return null;
  }

  /**
   * Extract published date from text.
   */
  private extractPublishedDate(lines: string[]): string | null {
    const datePatterns = [
      /Date[:\s]+(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})/i,
      /Published[:\s]+(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})/i,
      /(\d{4}-\d{2}-\d{2})/, // ISO date
      /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})/i,
    ];

    for (const line of lines) {
      for (const pattern of datePatterns) {
        const match = line.match(pattern);
        if (match) return match[1];
      }
    }

    return null;
  }

  /**
   * Basic language detection based on character distribution.
   */
  private extractLanguage(text: string): string {
    // Check for Devanagari (Hindi, Marathi, etc.)
    if (/[\u0900-\u097F]/.test(text)) return 'hi';
    // Check for Tamil
    if (/[\u0B80-\u0BFF]/.test(text)) return 'ta';
    // Check for Telugu
    if (/[\u0C00-\u0C7F]/.test(text)) return 'te';
    // Default to English
    return 'en';
  }
}

export const documentMetadataExtractor = new DocumentMetadataExtractor();