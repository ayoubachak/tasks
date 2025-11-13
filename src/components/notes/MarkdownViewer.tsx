import { useMemo, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useImageStore, useAudioStore } from '@/stores';
import type { Components } from 'react-markdown';

interface MarkdownViewerProps {
  content: string;
  className?: string;
}

export function MarkdownViewer({ content, className }: MarkdownViewerProps) {
  const { getImageData, updateLastUsed } = useImageStore();
  const { getAudio, getAudioData, updateLastUsed: updateAudioLastUsed } = useAudioStore();
  
  // Process content: resolve image and audio references
  const { processedContent, imageMap, imageIds, audioMap, audioIds } = useMemo(() => {
    const map = new Map<string, { src: string; alt: string }>();
    const ids: string[] = [];
    let processed = content;
    let imageIndex = 0;

    // First, handle image references (image:abc123) - resolve them to data URIs
    const referenceRegex = /!\[([^\]]*)\]\((image:([^)]+))\)/g;
    const referenceMatches: Array<{ full: string; alt: string; ref: string; id: string }> = [];
    
    let match;
    while ((match = referenceRegex.exec(content)) !== null) {
      const id = match[3];
      const dataUri = getImageData(id);
      if (dataUri) {
        referenceMatches.push({
          full: match[0],
          alt: match[1] || 'Image',
          ref: match[2],
          id,
        });
        ids.push(id); // Collect IDs to update later
      }
    }

    // Replace image references with placeholders (for react-markdown parsing)
    for (let i = referenceMatches.length - 1; i >= 0; i--) {
      const m = referenceMatches[i];
      const dataUri = getImageData(m.id);
      if (dataUri) {
        const placeholder = `IMAGE_PLACEHOLDER_${imageIndex}`;
        map.set(placeholder, { src: dataUri, alt: m.alt });
        processed = processed.replace(m.full, `![${m.alt}](${placeholder})`);
        imageIndex++;
      }
    }

    // Second, handle legacy data URIs (for backward compatibility)
    // Extract long data URIs that react-markdown might truncate
    const dataUriRegex = /!\[([^\]]*)\]\((data:[^)]+)\)/g;
    const dataUriMatches: Array<{ full: string; alt: string; src: string }> = [];
    
    while ((match = dataUriRegex.exec(processed)) !== null) {
      dataUriMatches.push({
        full: match[0],
        alt: match[1] || 'Image',
        src: match[2],
      });
    }

    // Replace legacy data URIs with placeholders
    for (let i = dataUriMatches.length - 1; i >= 0; i--) {
      const m = dataUriMatches[i];
      const placeholder = `IMAGE_PLACEHOLDER_${imageIndex}`;
      map.set(placeholder, { src: m.src, alt: m.alt });
      processed = processed.replace(m.full, `![${m.alt}](${placeholder})`);
      imageIndex++;
    }

    const audioMap = new Map<string, { src: string; title: string; mimeType?: string }>();
    const audioIds: string[] = [];
    
    const audioReferenceRegex = /!\[([^\]]*)\]\((audio:([^)]+))\)/g;
    processed = processed.replace(audioReferenceRegex, (_, altText: string, ref: string, id: string) => {
      const dataUri = getAudioData(id);
      const audioMeta = getAudio(id);
      if (!dataUri) {
        return `![${altText}](audio:${id})`;
      }

      const placeholder = `AUDIO_PLACEHOLDER_${audioMap.size}`;
      audioMap.set(placeholder, {
        src: dataUri,
        title: altText || audioMeta?.filename || 'Audio recording',
        mimeType: audioMeta?.mimeType,
      });
      audioIds.push(id);
      const displayTitle = altText || audioMeta?.filename || 'Audio recording';
      return `![${displayTitle}](${placeholder})`;
    });

    return { processedContent: processed, imageMap: map, imageIds: ids, audioMap, audioIds };
  }, [content, getImageData, getAudioData, getAudio]);

  // Update last used timestamps after render (not during)
  useEffect(() => {
    imageIds.forEach((id) => {
      updateLastUsed(id);
    });
    audioIds.forEach((id) => {
      updateAudioLastUsed(id);
    });
  }, [imageIds, audioIds, updateLastUsed, updateAudioLastUsed]);

  const components: Components = {
    code({ node, inline, className: codeClassName, children, ...props }) {
      const match = /language-(\w+)/.exec(codeClassName || '');
      const language = match ? match[1] : '';
      
      return !inline && match ? (
        <SyntaxHighlighter
          style={oneDark}
          language={language}
          PreTag="div"
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code className={codeClassName} {...props}>
          {children}
        </code>
      );
    },
    img({ node, src, alt, ...props }) {
      if (src && src.startsWith('AUDIO_PLACEHOLDER_')) {
        const audioData = audioMap.get(src);
        if (audioData) {
          return (
            <div className="my-4 space-y-1">
              <audio controls className="w-full max-w-md" preload="metadata">
                <source src={audioData.src} type={audioData.mimeType ?? undefined} />
                Your browser does not support the audio element.
              </audio>
              {audioData.title && (
                <p className="text-xs text-muted-foreground">{audioData.title}</p>
              )}
            </div>
          );
        }
        return (
          <p className="my-4 text-sm text-muted-foreground">
            Audio file unavailable.
          </p>
        );
      }

      // Check if this is a placeholder we created
      if (src && src.startsWith('IMAGE_PLACEHOLDER_')) {
        const imageData = imageMap.get(src);
        if (imageData) {
          // Use a span with display block instead of div (valid inside <p>)
          return (
            <span className="block my-4">
              <img
                src={imageData.src}
                alt={imageData.alt || 'Image'}
                className="max-w-full rounded-lg border shadow-sm"
                loading="lazy"
                onError={(e) => {
                  console.error('Failed to load extracted image');
                  e.currentTarget.style.display = 'none';
                }}
                onLoad={() => {
                  // console.log('Extracted image loaded successfully');
                }}
              />
            </span>
          );
        } else {
          console.warn('Placeholder not found in map:', src);
        }
      }
      
      // Handle regular images (non-data URI or if extraction failed)
      if (!src || src.trim() === '') {
        return null;
      }
      
      // Handle base64 images (data URIs) that react-markdown managed to parse
      if (src.startsWith('data:')) {
        // Use a span with display block instead of div (valid inside <p>)
        return (
          <span className="block my-4">
            <img
              src={src}
              alt={alt || 'Image'}
              className="max-w-full rounded-lg border shadow-sm"
              loading="lazy"
              onError={(e) => {
                console.error('Failed to load image');
                e.currentTarget.style.display = 'none';
              }}
              onLoad={() => {
                // console.log('Image loaded successfully');
              }}
              {...props}
            />
          </span>
        );
      }
      
      // Handle regular URLs
      return (
        <span className="block my-4">
          <img
            src={src}
            alt={alt || 'Image'}
            className="max-w-full rounded-lg border shadow-sm"
            loading="lazy"
            onError={(e) => {
              console.error('Failed to load image:', src);
              e.currentTarget.style.display = 'none';
            }}
            {...props}
          />
        </span>
      );
    },
    a({ node, href, children, ...props }) {
      if (href && href.startsWith('AUDIO_PLACEHOLDER_')) {
        const audioData = audioMap.get(href);
        if (audioData) {
          return (
            <div className="my-4 space-y-1">
              <audio controls className="w-full max-w-md" preload="metadata">
                <source src={audioData.src} type={audioData.mimeType ?? undefined} />
                Your browser does not support the audio element.
              </audio>
              {audioData.title && (
                <p className="text-xs text-muted-foreground">{audioData.title}</p>
              )}
            </div>
          );
        }
        return (
          <p className="my-4 text-sm text-muted-foreground">
            Audio file unavailable.
          </p>
        );
      }

      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline hover:text-primary/80"
          {...props}
        >
          {children}
        </a>
      );
    },
  };

  return (
    <div className={`prose prose-lg dark:prose-invert max-w-none ${className || ''}`} style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif' }}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}

