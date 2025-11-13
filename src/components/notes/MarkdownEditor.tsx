import { useEffect, useRef, useCallback, useImperativeHandle, forwardRef, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { useImagePaste } from '@/hooks/useImagePaste';
import { useMediaStore, createMediaReference } from '@/stores';
import { Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MarkdownToolbar } from './MarkdownToolbar';
import { AudioRecorder } from './AudioRecorder';
import type { PasteImageResult } from '@/hooks/useImagePaste';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onImagePaste?: (image: PasteImageResult) => void;
  className?: string;
  rows?: number;
  showToolbar?: boolean;
}

export interface MarkdownEditorRef {
  getValue: () => string;
  setValue: (value: string) => void;
  focus: () => void;
}

export const MarkdownEditor = forwardRef<MarkdownEditorRef, MarkdownEditorProps>(({
  value,
  onChange,
  placeholder = 'Write your notes in Markdown...',
  onImagePaste,
  className,
  rows = 10,
  showToolbar = false,
}, ref) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastSyncedValueRef = useRef<string>(value);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const storeMedia = useMediaStore((state) => state.storeMedia);
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  
  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    getValue: () => textareaRef.current?.value || '',
    setValue: (newValue: string) => {
      if (textareaRef.current) {
        textareaRef.current.value = newValue;
        lastSyncedValueRef.current = newValue;
      }
    },
    focus: () => {
      textareaRef.current?.focus();
    },
  }));

  // Sync external value changes to textarea (but don't trigger onChange)
  useEffect(() => {
    if (textareaRef.current && value !== lastSyncedValueRef.current) {
      const textarea = textareaRef.current;
      const cursorPos = textarea.selectionStart;
      textarea.value = value;
      lastSyncedValueRef.current = value;
      // Restore cursor position
      textarea.setSelectionRange(cursorPos, cursorPos);
    }
  }, [value]);

  // Debounced onChange - only sync to parent after user stops typing
  const syncToParent = useCallback((newValue: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      lastSyncedValueRef.current = newValue;
      onChange(newValue);
    }, 150); // Short debounce for responsiveness
  }, [onChange]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleImagePaste = useCallback((image: PasteImageResult) => {
    // Ensure we have valid image data
    if (!image.data || image.data.trim() === '') {
      console.warn('Invalid image data - cannot insert');
      return;
    }
    
    // Verify image data starts with data: (base64)
    if (!image.data.startsWith('data:')) {
      console.warn('Image data is not a valid data URI:', image.data.substring(0, 50));
      return;
    }
    
    // Get cursor position for insertion
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const cursorPos = textarea.selectionStart;
    const currentValue = textarea.value;
    
    // Store image and get short reference ID
    const imageId = storeMedia({
      type: 'image',
      data: image.data,
      mimeType: image.mimeType,
      filename: image.filename,
      size: image.size,
      width: image.width,
      height: image.height,
    });
    
    // Create markdown with short reference instead of full data URI
    const alt = image.filename || 'Image';
    const imageReference = createMediaReference(imageId);
    const imageMarkdown = `\n\n![${alt}](${imageReference})\n\n`;
    
    // Insert image at cursor position
    const before = currentValue.slice(0, cursorPos);
    const after = currentValue.slice(cursorPos);
    const newContent = before + imageMarkdown + after;
    
    // Update textarea directly (uncontrolled)
    textarea.value = newContent;
    lastSyncedValueRef.current = newContent;
    
    // Restore cursor position
    const newPos = cursorPos + imageMarkdown.length;
    textarea.setSelectionRange(newPos, newPos);
    textarea.focus();
    
    // Sync to parent immediately for images
    onChange(newContent);
    
    // Also notify parent if callback provided
    onImagePaste?.(image);
  }, [onChange, onImagePaste, storeMedia]);

  const { handlePaste } = useImagePaste(handleImagePaste, {
    maxSize: 5 * 1024 * 1024, // 5MB
    compress: true,
  });

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.addEventListener('paste', handlePaste);
    return () => {
      textarea.removeEventListener('paste', handlePaste);
    };
  }, [handlePaste]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDimension = 2048;
        let { width, height } = img;

        if (width > maxDimension || height > maxDimension) {
          const ratio = Math.min(maxDimension / width, maxDimension / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) return;
            const reader = new FileReader();
            reader.onload = () => {
              const result: PasteImageResult = {
                data: reader.result as string,
                mimeType: file.type,
                filename: file.name,
                size: file.size,
                width,
                height,
              };
              handleImagePaste(result);
            };
            reader.readAsDataURL(blob);
          },
          file.type,
          0.8
        );
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset input
  };

  const handleToolbarInsert = (before: string, after: string, placeholder?: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = textarea.value;
    const selectedText = currentValue.substring(start, end);
    const placeholderText = placeholder || selectedText;

    const beforeText = currentValue.substring(0, start);
    const afterText = currentValue.substring(end);

    const newText = beforeText + before + placeholderText + after + afterText;
    const newCursorPos = start + before.length + placeholderText.length + after.length;

    // Update textarea directly
    textarea.value = newText;
    lastSyncedValueRef.current = newText;
    
    // Sync to parent
    onChange(newText);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleToolbarImageUpload = () => {
    document.getElementById('image-upload')?.click();
  };

  const handleAudioInsert = (audioMarkdown: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const cursorPos = textarea.selectionStart;
    const currentValue = textarea.value;
    
    // Insert audio markdown at cursor position
    const before = currentValue.slice(0, cursorPos);
    const after = currentValue.slice(cursorPos);
    const newContent = before + audioMarkdown + after;
    
    // Update textarea directly (uncontrolled)
    textarea.value = newContent;
    lastSyncedValueRef.current = newContent;
    
    // Restore cursor position
    const newPos = cursorPos + audioMarkdown.length;
    textarea.setSelectionRange(newPos, newPos);
    textarea.focus();
    
    // Sync to parent immediately for audio
    onChange(newContent);
    setShowAudioRecorder(false);
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {showToolbar && (
        <>
          <MarkdownToolbar
            onInsert={handleToolbarInsert}
            onImageUpload={handleToolbarImageUpload}
            onToggleAudio={() => setShowAudioRecorder((prev) => !prev)}
            audioActive={showAudioRecorder}
          />
          {showAudioRecorder && (
            <div className="border-b bg-muted/30 p-1 sm:p-2">
              <AudioRecorder
                onInsert={handleAudioInsert}
                onClose={() => setShowAudioRecorder(false)}
              />
            </div>
          )}
        </>
      )}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {!showToolbar && (
          <div className="mb-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 flex-shrink-0">
            <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
              <ImageIcon className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Paste images or click to upload</span>
              <span className="sm:hidden">Paste or upload images</span>
            </div>
            <div>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileInput}
                className="hidden"
                id="image-upload"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('image-upload')?.click()}
                className="text-xs sm:text-sm"
              >
                <ImageIcon className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Upload Image</span>
                <span className="sm:hidden">Upload</span>
              </Button>
            </div>
          </div>
        )}
        {showToolbar && (
          <input
            type="file"
            accept="image/*"
            onChange={handleFileInput}
            className="hidden"
            id="image-upload"
          />
        )}
        <div className="flex-1 min-h-0 flex flex-col border rounded-md bg-background overflow-hidden">
          <Textarea
            ref={textareaRef}
            defaultValue={value}
            onChange={(e) => {
              // Uncontrolled: typing doesn't trigger React re-renders
              // Only sync to parent debounced
              const newValue = e.target.value;
              syncToParent(newValue);
            }}
            onBlur={(e) => {
              // Sync immediately on blur to ensure we don't lose data
              const newValue = e.target.value;
              if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
              }
              lastSyncedValueRef.current = newValue;
              onChange(newValue);
            }}
            placeholder={placeholder}
            rows={rows}
            className="prose prose-sm sm:prose-base md:prose-lg dark:prose-invert max-w-none w-full resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none rounded-md text-sm sm:text-base leading-relaxed p-3 sm:p-4"
            style={{ 
              height: '100%',
              minHeight: 0,
              overflowY: 'auto',
              overflowX: 'hidden',
              boxSizing: 'border-box',
              fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
            }}
          />
        </div>
        {!showToolbar && (
          <p className="mt-2 text-xs text-muted-foreground flex-shrink-0 px-1">
            <span className="hidden sm:inline">Supports Markdown syntax. Paste images directly or use the upload button. Media is stored with short references (media:abc123) for cleaner editing.</span>
            <span className="sm:hidden">Markdown supported. Paste images or upload.</span>
          </p>
        )}
      </div>
    </div>
  );
});

MarkdownEditor.displayName = 'MarkdownEditor';

