import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Pause, Play, X } from 'lucide-react';
import { useAudioRecord } from '@/hooks/useAudioRecord';
import { useAudioStore, createAudioReference } from '@/stores/audioStore';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

interface AudioRecorderProps {
  onInsert: (audioMarkdown: string) => void;
  onClose?: () => void;
  className?: string;
}

export function AudioRecorder({ onInsert, onClose, className }: AudioRecorderProps) {
  const { storeAudio } = useAudioStore();
  const [hasStarted, setHasStarted] = useState(false);

  const handleRecordComplete = (audio: { data: string; mimeType: string; filename: string; size: number; duration?: number }) => {
    try {
      // Store audio and get short reference ID
      const audioId = storeAudio(
        audio.data,
        audio.mimeType,
        audio.filename,
        audio.size,
        audio.duration
      );
      
      // Create markdown with short reference
      const audioRef = createAudioReference(audioId);
      const alt = audio.filename?.replace(/\.[^/.]+$/, '') || 'Audio Recording';
      const audioMarkdown = `\n\n![${alt}](${audioRef})\n\n`;
      
      // Insert into editor
      onInsert(audioMarkdown);
      
      toast.success('Audio recording saved');
      onClose?.();
      setHasStarted(false);
    } catch (error) {
      console.error('Error saving audio:', error);
      toast.error('Failed to save audio recording');
    }
  };

  const {
    isRecording,
    isPaused,
    error,
    duration,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
  } = useAudioRecord(handleRecordComplete);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn("flex items-center gap-1 sm:gap-2 bg-background border rounded-md px-2 py-1", className)}>
      {!isRecording ? (
        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => {
              startRecording();
              setHasStarted(true);
            }}
            className="h-6 sm:h-7 px-2 sm:px-3 text-xs sm:text-sm"
          >
            <Mic className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
            <span className="hidden sm:inline">Record</span>
            <span className="sm:hidden">Rec</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              if (hasStarted) {
                cancelRecording();
              }
              setHasStarted(false);
              onClose?.();
            }}
            className="h-6 w-6 sm:h-7 sm:w-7 !p-0"
            title="Close recorder"
          >
            <X className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="flex items-center gap-1">
              <div className={cn(
                "h-2 w-2 rounded-full",
                isRecording && !isPaused ? "bg-red-500 animate-pulse" : "bg-gray-400"
              )} />
              <span className="text-xs sm:text-sm font-mono">
                {formatDuration(duration)}
              </span>
            </div>
            
            {isPaused ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resumeRecording}
                className="h-6 w-6 sm:h-7 sm:w-7 !p-0"
                title="Resume"
              >
                <Play className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={pauseRecording}
                className="h-6 w-6 sm:h-7 sm:w-7 !p-0"
                title="Pause"
              >
                <Pause className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            )}
            
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={stopRecording}
              className="h-6 w-6 sm:h-7 sm:w-7 !p-0 bg-red-500 hover:bg-red-600"
              title="Stop & Save"
            >
              <Square className="h-3 w-3 sm:h-4 sm:w-4 fill-current" />
            </Button>
            
            <Button
              type="button"
              variant="ghost"
              size="sm"
            onClick={() => {
              cancelRecording();
              setHasStarted(false);
              onClose?.();
            }}
              className="h-6 w-6 sm:h-7 sm:w-7 !p-0"
              title="Cancel"
            >
              <X className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </>
      )}
      
      {error && (
        <span className="text-xs text-destructive ml-2">{error}</span>
      )}
    </div>
  );
}

