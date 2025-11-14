import { useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useMediaStore } from '@/stores';
import { useMarkdownMedia } from '@/hooks/useMarkdownMedia';
import { createMarkdownComponents } from './markdownComponents';

interface MarkdownViewerProps {
  readonly content: string;
  readonly className?: string;
}

export function MarkdownViewer({ content, className }: MarkdownViewerProps) {
  const updateLastUsed = useMediaStore((state) => state.updateLastUsed);
  
  // Process content: resolve image and audio references
  const { processedContent, imageMap, audioMap, videoMap, usedMediaIds } = useMarkdownMedia(content);

  // Update last used timestamps after render (not during)
  useEffect(() => {
    for (const id of usedMediaIds) {
      updateLastUsed(id);
    }
  }, [usedMediaIds, updateLastUsed]);

  const components = useMemo(
    () => createMarkdownComponents({ imageMap, audioMap, videoMap }),
    [imageMap, audioMap, videoMap]
  );

  return (
    <div className={`markdown-body ${className || ''}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}

