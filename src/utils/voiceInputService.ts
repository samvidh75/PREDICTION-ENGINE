/**
 * Voice Input Service
 * Browser-based speech-to-text using Whisper.cpp
 * - Records audio from microphone
 * - Sends to Whisper worker for transcription
 * - Handles audio encoding and cleanup
 */

export interface VoiceInputState {
  isRecording: boolean;
  isTranscribing: boolean;
  transcript: string;
  confidence: number;
  duration: number;
  error: string | null;
}

export interface TranscriptionResult {
  text: string;
  confidence: number;
  language?: string;
  duration: number;
}

class VoiceInputService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private audioChunks: Blob[] = [];
  private startTime: number = 0;
  private state: VoiceInputState = {
    isRecording: false,
    isTranscribing: false,
    transcript: '',
    confidence: 0,
    duration: 0,
    error: null,
  };
  private stateCallbacks: Array<(state: VoiceInputState) => void> = [];
  private whisperWorker: Worker | null = null;

  constructor() {
    this.initializeWhisperWorker();
  }

  /**
   * Initialize Whisper worker for transcription
   */
  private initializeWhisperWorker(): void {
    try {
      this.whisperWorker = new Worker(
        new URL('./voiceTranscriptionWorker.ts', import.meta.url),
        { type: 'module' },
      );

      this.whisperWorker.onmessage = (e: MessageEvent) => {
        const { type, data, error } = e.data;

        if (type === 'TRANSCRIPTION_COMPLETE') {
          this.updateState({
            isTranscribing: false,
            transcript: data.text,
            confidence: data.confidence,
          });
        }

        if (type === 'TRANSCRIPTION_ERROR') {
          this.updateState({
            isTranscribing: false,
            error: error || 'Transcription failed',
          });
        }
      };
    } catch (error) {
      console.warn('Whisper worker initialization failed:', error);
    }
  }

  /**
   * Check if browser supports Web Audio API
   */
  isSupported(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  /**
   * Start recording audio
   */
  async startRecording(): Promise<void> {
    if (this.state.isRecording) return;

    try {
      // Request microphone permission
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Create audio context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      // Create media recorder
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      this.audioChunks = [];
      this.startTime = Date.now();

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start();
      this.updateState({ isRecording: true, error: null });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Microphone access denied';
      this.updateState({
        error: errorMsg,
        isRecording: false,
      });
      throw error;
    }
  }

  /**
   * Stop recording and send to Whisper for transcription
   */
  async stopRecording(): Promise<TranscriptionResult | null> {
    if (!this.state.isRecording || !this.mediaRecorder) return null;

    return new Promise((resolve) => {
      if (!this.mediaRecorder) {
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = async () => {
        try {
          const duration = Date.now() - this.startTime;

          // Create audio blob
          const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });

          // Stop stream
          if (this.stream) {
            this.stream.getTracks().forEach((track) => track.stop());
            this.stream = null;
          }

          // Send to Whisper worker
          this.updateState({
            isRecording: false,
            isTranscribing: true,
            duration,
          });

          // Convert blob to base64 and send to worker
          const reader = new FileReader();
          reader.onload = () => {
            const base64Audio = reader.result as string;
            if (this.whisperWorker) {
              this.whisperWorker.postMessage({
                type: 'TRANSCRIBE_AUDIO',
                payload: {
                  audio: base64Audio,
                  duration,
                },
              });
            }
          };
          reader.readAsDataURL(audioBlob);

          // Return immediately (actual result comes via callback)
          resolve({
            text: '',
            confidence: 0,
            duration,
          });
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Recording failed';
          this.updateState({ error: errorMsg, isTranscribing: false });
          resolve(null);
        }
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * Cancel recording without transcribing
   */
  cancelRecording(): void {
    if (this.mediaRecorder && this.state.isRecording) {
      this.mediaRecorder.stop();
      if (this.stream) {
        this.stream.getTracks().forEach((track) => track.stop());
        this.stream = null;
      }
      this.updateState({
        isRecording: false,
        isTranscribing: false,
        transcript: '',
      });
    }
  }

  /**
   * Get current state
   */
  getState(): VoiceInputState {
    return { ...this.state };
  }

  /**
   * Subscribe to state changes
   */
  subscribe(callback: (state: VoiceInputState) => void): () => void {
    this.stateCallbacks.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.stateCallbacks.indexOf(callback);
      if (index > -1) {
        this.stateCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Update state and notify subscribers
   */
  private updateState(partial: Partial<VoiceInputState>): void {
    this.state = { ...this.state, ...partial };
    this.stateCallbacks.forEach((callback) => callback(this.state));
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.cancelRecording();
    if (this.whisperWorker) {
      this.whisperWorker.terminate();
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}

export const voiceInputService = new VoiceInputService();
