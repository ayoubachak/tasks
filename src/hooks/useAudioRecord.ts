import { useState, useCallback, useRef, useEffect } from 'react';

export interface AudioRecordResult {
  data: string; // base64 data URI
  mimeType: string;
  filename: string;
  size: number;
  duration?: number; // seconds
  blob: Blob; // Original blob for potential reuse
}

const MAX_AUDIO_SIZE = 10 * 1024 * 1024; // 10MB (audio files can be larger than images)

/**
 * Custom hook for recording audio using MediaRecorder API
 * Returns recording state and controls
 */
export function useAudioRecord(
  onRecordComplete: (audio: AudioRecordResult) => void,
  options?: {
    maxSize?: number;
    mimeType?: string; // Preferred mime type (browser will use best available)
  }
) {
  const maxSize = options?.maxSize ?? MAX_AUDIO_SIZE;
  const preferredMimeType = options?.mimeType;
  
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const durationRef = useRef<number>(0);

  // Get supported MIME types
  const getSupportedMimeType = useCallback((): string => {
    if (!MediaRecorder.isTypeSupported) {
      return 'audio/webm'; // Default fallback
    }

    // Try preferred type first
    if (preferredMimeType && MediaRecorder.isTypeSupported(preferredMimeType)) {
      return preferredMimeType;
    }

    // Try common audio formats in order of preference
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/wav',
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return 'audio/webm'; // Final fallback
  }, [preferredMimeType]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      streamRef.current = stream;
      audioChunksRef.current = [];
      durationRef.current = 0;
      setDuration(0);
      
      // Create MediaRecorder with best supported format
      const mimeType = getSupportedMimeType();
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
      });
      
      mediaRecorderRef.current = mediaRecorder;
      
      // Collect audio chunks
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      // Handle recording stop
      mediaRecorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        
        // Combine chunks into single blob
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        
        // Check size
        if (blob.size > maxSize) {
          setError(`Recording too large (${(blob.size / 1024 / 1024).toFixed(2)}MB). Maximum is ${maxSize / 1024 / 1024}MB.`);
          setIsRecording(false);
          setIsPaused(false);
          setDuration(0);
          durationRef.current = 0;
          return;
        }
        
        // Convert to base64
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result as string;
          
          // Calculate duration if possible (approximate from blob size and bitrate)
          // For more accurate duration, we'd need to decode the audio, but that's expensive
          // For now, we'll use the recorded duration from our timer
          const finalDuration = durationRef.current;
          
          const result: AudioRecordResult = {
            data: base64,
            mimeType,
            filename: `audio-recording-${Date.now()}.${mimeType.split('/')[1]?.split(';')[0] || 'webm'}`,
            size: blob.size,
            duration: finalDuration > 0 ? finalDuration : undefined,
            blob,
          };
          
          onRecordComplete(result);
          
          // Reset state
          setIsRecording(false);
          setIsPaused(false);
          setDuration(0);
          durationRef.current = 0;
          audioChunksRef.current = [];
        };
        
        reader.onerror = () => {
          setError('Failed to process audio recording');
          setIsRecording(false);
          setIsPaused(false);
          setDuration(0);
          durationRef.current = 0;
        };
        
        reader.readAsDataURL(blob);
      };
      
      // Handle errors
      mediaRecorder.onerror = (event: any) => {
        setError(`Recording error: ${event.error?.message || 'Unknown error'}`);
        setIsRecording(false);
        setIsPaused(false);
      };
      
      // Start recording
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      startTimeRef.current = Date.now();
      durationRef.current = 0;
      setDuration(0);
      
      // Start duration timer
      durationIntervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        const rounded = Math.floor(elapsed);
        setDuration(rounded);
        durationRef.current = rounded;
      }, 100);
      
    } catch (err) {
      console.error('Error starting audio recording:', err);
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError('Microphone access denied. Please allow microphone access and try again.');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setError('No microphone found. Please connect a microphone and try again.');
        } else {
          setError(`Failed to start recording: ${err.message}`);
        }
      } else {
        setError('Failed to start recording. Please try again.');
      }
      setIsRecording(false);
    }
  }, [getSupportedMimeType, maxSize, onRecordComplete]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      
      // Clear duration interval
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    }
    
    // Stop stream tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, [isRecording]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      
      // Pause duration timer
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    }
  }, [isRecording, isPaused]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      
      // Resume duration timer
      startTimeRef.current = Date.now() - (durationRef.current * 1000);
      durationIntervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        const rounded = Math.floor(elapsed);
        setDuration(rounded);
        durationRef.current = rounded;
      }, 100);
    }
  }, [isRecording, isPaused]);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    
    // Stop stream tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Clear duration interval
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    
    // Reset state
    setIsRecording(false);
    setIsPaused(false);
    setDuration(0);
    durationRef.current = 0;
    audioChunksRef.current = [];
    setError(null);
  }, [isRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, []);

  return {
    isRecording,
    isPaused,
    error,
    duration,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
  };
}

