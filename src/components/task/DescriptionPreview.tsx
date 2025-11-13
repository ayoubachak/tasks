import { useMemo } from 'react';
import { MarkdownViewer } from '@/components/notes/MarkdownViewer';

interface DescriptionPreviewProps {
  content: string;
  maxLines?: number;
  className?: string;
}

/**
 * Smart description preview that:
 * - Shows first few lines of text
 * - Handles images gracefully (shows placeholder instead)
 * - Caps height to prevent massive images
 */
export function DescriptionPreview({ 
  content, 
  maxLines = 3,
  className 
}: DescriptionPreviewProps) {
  const previewContent = useMemo(() => {
    if (!content) return '';
    
    // Extract image references to replace them with placeholders
    const imageRefRegex = /!\[([^\]]*)\]\((image:[^)]+)\)/g;
    const dataUriRegex = /!\[([^\]]*)\]\((data:[^)]+)\)/g;
    
    let processed = content;
    
    // Replace image references with text placeholders
    processed = processed.replace(imageRefRegex, (_match, alt) => {
      return `[📷 ${alt || 'Image'}]`;
    });
    
    // Replace data URI images with text placeholders
    processed = processed.replace(dataUriRegex, (_match, alt) => {
      return `[📷 ${alt || 'Image'}]`;
    });
    
    // Split into lines and take first maxLines
    const lines = processed.split('\n');
    const previewLines = lines.slice(0, maxLines);
    
    // If content was truncated, add ellipsis
    if (lines.length > maxLines) {
      previewLines.push('...');
    }
    
    return previewLines.join('\n');
  }, [content, maxLines]);

  if (!content) {
    return null;
  }

  const lineClampClass = maxLines === 1 ? 'line-clamp-1' : maxLines === 2 ? 'line-clamp-2' : maxLines === 3 ? 'line-clamp-3' : 'line-clamp-4';

  return (
    <div className={`text-sm text-muted-foreground ${lineClampClass} ${className || ''}`}>
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <MarkdownViewer 
          content={previewContent} 
          className="prose-sm"
        />
      </div>
    </div>
  );
}

