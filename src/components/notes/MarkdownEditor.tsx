import { useEffect, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { useImagePaste } from '@/hooks/useImagePaste';
import { useImageStore, createImageReference } from '@/stores';
import { Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PasteImageResult } from '@/hooks/useImagePaste';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onImagePaste?: (image: PasteImageResult) => void;
  className?: string;
  rows?: number;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Write your notes in Markdown...',
  onImagePaste,
  className,
  rows = 10,
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isInternalUpdate = useRef(false);
  const { storeImage } = useImageStore();
  
  // Use value directly - this is a controlled component
  const content = value;

  const handleImagePaste = (image: PasteImageResult) => {
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
    const cursorPos = textarea?.selectionStart ?? undefined;
    
    // Store image and get short reference ID
    const imageId = storeImage(
      image.data,
      image.mimeType,
      image.filename,
      image.size,
      image.width,
      image.height
    );
    
    // Create markdown with short reference instead of full data URI
    const alt = image.filename || 'Image';
    const imageReference = createImageReference(imageId);
    const imageMarkdown = `\n\n![${alt}](${imageReference})\n\n`;
    
    // Debug: Log image insertion
    console.log('Inserting image with reference:', {
      alt,
      imageId,
      reference: imageReference,
      dataLength: image.data.length,
    });
    
    // Insert image at cursor position or append
    let newContent: string;
    if (cursorPos !== undefined && textarea) {
      const before = content.slice(0, cursorPos);
      const after = content.slice(cursorPos);
      newContent = before + imageMarkdown + after;
    } else {
      // Append to end
      newContent = content ? `${content}${imageMarkdown}` : imageMarkdown.trim();
    }
    
    // Update parent immediately
    isInternalUpdate.current = true;
    onChange(newContent);
    console.log('Content updated, new length:', newContent.length, 'contains image reference:', newContent.includes('image:'));
    
    // Restore cursor position after content updates
    setTimeout(() => {
      if (textarea) {
        const newPos = cursorPos !== undefined ? cursorPos + imageMarkdown.length : newContent.length;
        textarea.setSelectionRange(newPos, newPos);
        textarea.focus();
      }
    }, 0);
    
    // Also notify parent if callback provided
    onImagePaste?.(image);
  };

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

  return (
    <div className={className}>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ImageIcon className="h-4 w-4" />
          <span>Paste images or click to upload</span>
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
          >
            <ImageIcon className="mr-2 h-4 w-4" />
            Upload Image
          </Button>
        </div>
      </div>
      <Textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => {
          isInternalUpdate.current = true;
          onChange(e.target.value);
        }}
        placeholder={placeholder}
        rows={rows}
        className="font-mono text-sm"
      />
      <p className="mt-2 text-xs text-muted-foreground">
        Supports Markdown syntax. Paste images directly or use the upload button. Images are stored with short references (image:abc123) for cleaner editing.
      </p>
    </div>
  );
}

