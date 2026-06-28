/**
 * Transcript Types
 *
 * Conference call transcript data for Indian companies.
 * Supports multi-speaker transcripts, Q&A extraction, and sentiment tagging.
 */

export type TranscriptSpeaker = 'management' | 'analyst' | 'moderator' | 'other';

export interface TranscriptSegment {
  speaker: TranscriptSpeaker;
  speakerName: string;
  speakerAffiliation: string | null;
  text: string;
  timestamp: string | null;
  isQuestion: boolean;
  isAnswer: boolean;
}

export interface ConcallTranscript {
  id: string;
  symbol: string;
  companyName: string;
  title: string;
  callDate: string;
  callType: 'earnings' | 'agm' | 'analyst_day' | 'press' | 'other';
  fiscalPeriod: string; // e.g., "Q3FY24"
  duration: number | null; // minutes
  segments: TranscriptSegment[];
  summary: string | null;
  keyTopics: string[];
  sentiment: 'positive' | 'neutral' | 'negative' | null;
  sourceIds: string[];
  sourceUrls: string[];
  isProcessed: boolean;
}

export interface QAPair {
  question: TranscriptSegment;
  answers: TranscriptSegment[];
  topic: string | null;
}

export interface TranscriptFilter {
  symbols?: string[];
  callType?: string;
  fromDate?: string;
  toDate?: string;
  hasSummary?: boolean;
  limit?: number;
  offset?: number;
}
