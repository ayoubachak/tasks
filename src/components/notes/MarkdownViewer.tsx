import { useMemo, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useMediaStore } from '@/stores';
import type { Components } from 'react-markdown';

interface MarkdownViewerProps {
  content: string;
  className?: string;
}

export function MarkdownViewer({ content, className }: MarkdownViewerProps) {
  const getMedia = useMediaStore((state) => state.getMedia);
  const getMediaData = useMediaStore((state) => state.getMediaData);
  const updateLastUsed = useMediaStore((state) => state.updateLastUsed);
  
  // Process content: resolve image and audio references
  const { processedContent, imageMap, audioMap, videoMap, usedMediaIds } = useMemo(() => {
    const map = new Map<string, { src: string; alt: string }>();
    const audioMap = new Map<string, { src: string; title: string; mimeType?: string }>();
    const videoMap = new Map<string, { src: string; title: string; mimeType?: string; poster?: string }>();
    const usedIds = new Set<string>();
    let processed = content;
    let imageIndex = 0;

    const referenceRegex = /!\[([^\]]*)\]\(((?:media|image|audio):([^)]+))\)/g;
    processed = processed.replace(referenceRegex, (fullMatch, altText: string, ref: string, id: string) => {
      const prefix = ref.split(':')[0];
      const asset = getMedia(id);
      const dataUri = getMediaData(id);
      const assetType = asset?.type ?? (prefix === 'audio' ? 'audio' : 'image');
      const fallbackTitle =
        altText ||
        asset?.filename ||
        (assetType === 'audio'
          ? 'Audio recording'
          : assetType === 'video'
          ? 'Video clip'
          : 'Image');

      if (!dataUri) {
        return fullMatch;
      }

      usedIds.add(id);

      if (assetType === 'audio') {
        const placeholder = `AUDIO_PLACEHOLDER_${audioMap.size}`;
        audioMap.set(placeholder, {
          src: dataUri,
          title: fallbackTitle,
          mimeType: asset?.mimeType,
        });
        return `![${fallbackTitle}](${placeholder})`;
      }

      if (assetType === 'video') {
        const placeholder = `VIDEO_PLACEHOLDER_${videoMap.size}`;
        videoMap.set(placeholder, {
          src: dataUri,
          title: fallbackTitle,
          mimeType: asset?.mimeType,
          poster: typeof asset?.metadata?.poster === 'string' ? asset.metadata.poster : undefined,
        });
        return `![${fallbackTitle}](${placeholder})`;
      }

      const placeholder = `IMAGE_PLACEHOLDER_${imageIndex}`;
      map.set(placeholder, { src: dataUri, alt: fallbackTitle });
      imageIndex += 1;
      return `![${fallbackTitle}](${placeholder})`;
    });

    // Handle legacy data URIs (for backward compatibility)
    const dataUriRegex = /!\[([^\]]*)\]\((data:[^)]+)\)/g;
    const dataUriMatches: Array<{ full: string; alt: string; src: string }> = [];
    let match: RegExpExecArray | null;
    while ((match = dataUriRegex.exec(processed)) !== null) {
      dataUriMatches.push({
        full: match[0],
        alt: match[1] || 'Image',
        src: match[2],
      });
    }

    for (let i = dataUriMatches.length - 1; i >= 0; i--) {
      const { full, alt, src } = dataUriMatches[i];
      const placeholder = `IMAGE_PLACEHOLDER_${imageIndex}`;
      map.set(placeholder, { src, alt });
      processed = processed.replace(full, `![${alt}](${placeholder})`);
      imageIndex += 1;
    }

    return {
      processedContent: processed,
      imageMap: map,
      audioMap,
      videoMap,
      usedMediaIds: Array.from(usedIds),
    };
  }, [content, getMedia, getMediaData]);

  // Update last used timestamps after render (not during)
  useEffect(() => {
    usedMediaIds.forEach((id) => {
      updateLastUsed(id);
    });
  }, [usedMediaIds, updateLastUsed]);

  const components: Components = {
    code({ inline, className: codeClassName, children, ...props }: any) {
      const match = /language-(\w+)/.exec(codeClassName || '');
      const language = match ? match[1] : '';
      
      return !inline && match ? (
        <SyntaxHighlighter
          style={oneDark as any}
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

      if (src && src.startsWith('VIDEO_PLACEHOLDER_')) {
        const videoData = videoMap.get(src);
        if (videoData) {
          return (
            <div className="my-4 space-y-1">
              <video
                controls
                className="w-full max-w-xl rounded-lg border shadow-sm"
                preload="metadata"
                poster={videoData.poster}
              >
                <source src={videoData.src} type={videoData.mimeType ?? undefined} />
                Your browser does not support the video element.
              </video>
              {videoData.title && (
                <p className="text-xs text-muted-foreground">{videoData.title}</p>
              )}
            </div>
          );
        }
        return (
          <p className="my-4 text-sm text-muted-foreground">
            Video file unavailable.
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

