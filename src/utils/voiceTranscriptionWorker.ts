/**
 * Voice Transcription Worker
 * Uses Web Speech API + fallback to cloud API
 * Runs transcription without blocking main thread
 */

interface TranscriptionPayload {
  audio: string; // base64 encoded audio
  duration: number;
}

let recognition: any = null;

function initializeSpeechRecognition(): any {
  if (recognition) return recognition;

  const SpeechRecognition = (self as any).SpeechRecognition || (self as any).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    console.warn('Web Speech API not available, will use cloud fallback');
    return null;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = 'en-IN'; // Philippine English

  return recognition;
}

/**
 * Transcribe audio using Web Speech API
 * Note: Web Speech API requires real-time audio stream, not blob data
 * For blob transcription, we'd need a server-side Whisper API endpoint
 */
async function transcribeAudioWithWebSpeech(audioBase64: string, duration: number): Promise<any> {
  // Web Speech API works with live microphone stream via AudioContext
  // For pre-recorded audio (blob), we need server-side transcription
  // This is a limitation of browser APIs

  // Fallback: Send to server API endpoint if available
  try {
    const response = await fetch('/api/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audio: audioBase64,
        language: 'en-IN',
        duration,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        text: data.text || '',
        confidence: data.confidence || 0.8,
        language: 'en-IN',
        duration,
      };
    }
  } catch (error) {
    console.warn('Server transcription failed:', error);
  }

  // If all else fails, return empty transcription
  return {
    text: '',
    confidence: 0,
    language: 'en-IN',
    duration,
  };
}

(self as any).onmessage = async (e: { data: any }) => {
  const { type, payload } = e.data;

  if (type === 'TRANSCRIBE_AUDIO') {
    try {
      const result = await transcribeAudioWithWebSpeech(payload.audio, payload.duration);

      (self as any).postMessage({
        type: 'TRANSCRIPTION_COMPLETE',
        data: result,
      });
    } catch (error) {
      (self as any).postMessage({
        type: 'TRANSCRIPTION_ERROR',
        error: error instanceof Error ? error.message : 'Transcription failed',
      });
    }
  }
};
