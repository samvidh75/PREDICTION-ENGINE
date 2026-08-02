/**
 * Voice Input Component
 * Captures audio via microphone and converts to text
 */

import { useEffect, useState } from 'react';
import { voiceInputService, type VoiceInputState } from '../../utils/voiceInputService';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export default function VoiceInput({ onTranscript, disabled = false }: VoiceInputProps) {
  const [state, setState] = useState<VoiceInputState>({
    isRecording: false,
    isTranscribing: false,
    transcript: '',
    confidence: 0,
    duration: 0,
    error: null,
  });
  const [recordingTime, setRecordingTime] = useState(0);
  const [showUI, setShowUI] = useState(false);

  useEffect(() => {
    // Check if voice input is supported
    if (!voiceInputService.isSupported()) {
      console.warn('Voice input not supported on this browser');
      return;
    }

    // Subscribe to state changes
    const unsubscribe = voiceInputService.subscribe((newState) => {
      setState(newState);

      // If transcription complete, notify parent
      if (!newState.isTranscribing && newState.transcript && !newState.error) {
        onTranscript(newState.transcript);
        // Reset after 1 second
        setTimeout(() => {
          setState({
            isRecording: false,
            isTranscribing: false,
            transcript: '',
            confidence: 0,
            duration: 0,
            error: null,
          });
          setRecordingTime(0);
          setShowUI(false);
        }, 1000);
      }
    });

    return unsubscribe;
  }, [onTranscript]);

  // Update recording timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (state.isRecording) {
      interval = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 100);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [state.isRecording]);

  const handleStartRecording = async () => {
    try {
      setShowUI(true);
      setRecordingTime(0);
      await voiceInputService.startRecording();
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const handleStopRecording = async () => {
    await voiceInputService.stopRecording();
  };

  const handleCancel = () => {
    voiceInputService.cancelRecording();
    setShowUI(false);
    setRecordingTime(0);
  };

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (!voiceInputService.isSupported()) {
    return null; // Voice input not supported
  }

  if (!showUI) {
    return (
      <button
        onClick={handleStartRecording}
        disabled={disabled}
        title="Click to record voice input"
        style={{
          padding: '8px 12px',
          border: 'none',
          borderRadius: '50%',
          backgroundColor: '#0084ff',
          color: 'white',
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontSize: '16px',
          width: '40px',
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        🎤
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        backgroundColor: 'white',
        border: '2px solid #0084ff',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        minWidth: '280px',
        zIndex: 1000,
      }}
    >
      {/* Recording Mode */}
      {state.isRecording && (
        <>
          <div style={{ textAlign: 'center', marginBottom: '12px' }}>
            <div
              style={{
                fontSize: '32px',
                marginBottom: '8px',
                animation: 'pulse 1s infinite',
              }}
            >
              🎙️
            </div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#0084ff' }}>Recording...</div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>{formatTime(recordingTime)}</div>
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <button
              onClick={handleStopRecording}
              style={{
                padding: '8px 16px',
                backgroundColor: '#34a853',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold',
              }}
            >
              ✓ Done
            </button>
            <button
              onClick={handleCancel}
              style={{
                padding: '8px 16px',
                backgroundColor: '#ea4335',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold',
              }}
            >
              ✕ Cancel
            </button>
          </div>
        </>
      )}

      {/* Transcribing Mode */}
      {state.isTranscribing && (
        <div style={{ textAlign: 'center', marginBottom: '12px' }}>
          <div style={{ fontSize: '28px', marginBottom: '8px', animation: 'spin 1s linear infinite' }}>⏳</div>
          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#666' }}>Transcribing...</div>
          <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>{Math.round(state.duration / 1000)}s audio</div>
        </div>
      )}

      {/* Result Mode */}
      {state.transcript && !state.isTranscribing && (
        <>
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#666', marginBottom: '6px' }}>Transcript:</div>
            <div
              style={{
                padding: '10px',
                backgroundColor: '#f0f0f0',
                borderRadius: '6px',
                fontSize: '14px',
                lineHeight: '1.4',
                color: '#000',
              }}
            >
              {state.transcript}
            </div>
            {state.confidence > 0 && (
              <div style={{ fontSize: '11px', color: '#999', marginTop: '6px' }}>
                Confidence: {Math.round(state.confidence * 100)}%
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => {
                onTranscript(state.transcript);
                setShowUI(false);
              }}
              style={{
                flex: 1,
                padding: '8px',
                backgroundColor: '#0084ff',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold',
              }}
            >
              Use This
            </button>
            <button
              onClick={handleCancel}
              style={{
                flex: 1,
                padding: '8px',
                backgroundColor: '#e0e0e0',
                color: '#333',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold',
              }}
            >
              Discard
            </button>
          </div>
        </>
      )}

      {/* Error Mode */}
      {state.error && (
        <>
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>⚠️</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#ea4335', marginBottom: '4px' }}>Error:</div>
            <div style={{ fontSize: '12px', color: '#666' }}>{state.error}</div>
          </div>

          <button
            onClick={handleCancel}
            style={{
              width: '100%',
              padding: '8px',
              backgroundColor: '#ea4335',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold',
            }}
          >
            Close
          </button>
        </>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
