/**
 * Transcript Repository
 *
 * Manages conference call transcripts, Q&A extraction,
 * and topic/sentiment analysis for PSX equities.
 */

import type {
  ConcallTranscript,
  TranscriptSegment,
  QAPair,
  TranscriptFilter,
  TranscriptSpeaker,
} from './TranscriptTypes';

export class TranscriptRepository {
  private transcripts: Map<string, ConcallTranscript> = new Map();
  private bySymbol: Map<string, string[]> = new Map();

  add(transcript: ConcallTranscript): void {
    this.transcripts.set(transcript.id, transcript);

    const key = transcript.symbol.toUpperCase();
    const ids = this.bySymbol.get(key) ?? [];
    ids.push(transcript.id);
    ids.sort((a, b) => {
      const ta = this.transcripts.get(a)!;
      const tb = this.transcripts.get(b)!;
      return tb.callDate.localeCompare(ta.callDate);
    });
    this.bySymbol.set(key, ids);
  }

  getById(id: string): ConcallTranscript | undefined {
    return this.transcripts.get(id);
  }

  getBySymbol(symbol: string): ConcallTranscript[] {
    const ids = this.bySymbol.get(symbol.toUpperCase());
    if (!ids) return [];
    return ids.map(id => this.transcripts.get(id)!).filter(Boolean);
  }

  getLatest(symbol: string): ConcallTranscript | undefined {
    return this.getBySymbol(symbol)[0];
  }

  /** Extract Q&A pairs from a transcript */
  extractQAPairs(transcriptId: string): QAPair[] {
    const transcript = this.transcripts.get(transcriptId);
    if (!transcript) return [];

    const qaPairs: QAPair[] = [];
    let currentQuestion: TranscriptSegment | null = null;
    let currentAnswers: TranscriptSegment[] = [];

    for (const segment of transcript.segments) {
      if (segment.isQuestion) {
        if (currentQuestion) {
          qaPairs.push({
            question: currentQuestion,
            answers: [...currentAnswers],
            topic: this.inferTopic(currentQuestion.text),
          });
        }
        currentQuestion = segment;
        currentAnswers = [];
      } else if (segment.isAnswer && currentQuestion) {
        currentAnswers.push(segment);
      }
    }

    // Flush last Q&A
    if (currentQuestion) {
      qaPairs.push({
        question: currentQuestion,
        answers: [...currentAnswers],
        topic: this.inferTopic(currentQuestion.text),
      });
    }

    return qaPairs;
  }

  private inferTopic(text: string): string | null {
    const topics: Array<{ keyword: string; topic: string }> = [
      { keyword: 'revenue', topic: 'Revenue' },
      { keyword: 'margin', topic: 'Margins' },
      { keyword: 'capex', topic: 'Capex' },
      { keyword: 'guidance', topic: 'Guidance' },
      { keyword: 'dividend', topic: 'Dividend' },
      { keyword: 'debt', topic: 'Debt' },
      { keyword: 'expansion', topic: 'Expansion' },
      { keyword: 'competition', topic: 'Competition' },
      { keyword: 'raw material', topic: 'Raw Material Costs' },
      { keyword: 'order book', topic: 'Order Book' },
      { keyword: 'export', topic: 'Exports' },
      { keyword: 'regulation', topic: 'Regulation' },
    ];
    const lower = text.toLowerCase();
    for (const { keyword, topic } of topics) {
      if (lower.includes(keyword)) return topic;
    }
    return null;
  }

  query(filter: TranscriptFilter = {}): ConcallTranscript[] {
    let results: ConcallTranscript[] = [];

    if (filter.symbols && filter.symbols.length > 0) {
      for (const sym of filter.symbols) {
        results.push(...this.getBySymbol(sym));
      }
    } else {
      results = Array.from(this.transcripts.values());
    }

    if (filter.callType) results = results.filter(t => t.callType === filter.callType);
    if (filter.fromDate) results = results.filter(t => t.callDate >= filter.fromDate!);
    if (filter.toDate) results = results.filter(t => t.callDate <= filter.toDate!);
    if (filter.hasSummary !== undefined) {
      results = results.filter(t => (t.summary !== null) === filter.hasSummary);
    }

    results.sort((a, b) => b.callDate.localeCompare(a.callDate));

    const offset = filter.offset ?? 0;
    const limit = filter.limit ?? results.length;
    return results.slice(offset, offset + limit);
  }

  getStats(): {
    totalTranscripts: number;
    symbolsCovered: number;
    withSummary: number;
    withSentiment: number;
    totalQAPairs: number;
  } {
    let withSummary = 0;
    let withSentiment = 0;
    let totalQA = 0;

    for (const t of this.transcripts.values()) {
      if (t.summary) withSummary++;
      if (t.sentiment) withSentiment++;
      totalQA += t.segments.filter(s => s.isQuestion).length;
    }

    return {
      totalTranscripts: this.transcripts.size,
      symbolsCovered: this.bySymbol.size,
      withSummary,
      withSentiment,
      totalQAPairs: totalQA,
    };
  }
}

export const transcriptRepository = new TranscriptRepository();
