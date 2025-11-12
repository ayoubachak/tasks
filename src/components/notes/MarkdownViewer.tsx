import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useImageStore } from '@/stores';
import type { Components } from 'react-markdown';

interface MarkdownViewerProps {
  content: string;
  className?: string;
}

export function MarkdownViewer({ content, className }: MarkdownViewerProps) {
  const { getImageData, updateLastUsed } = useImageStore();
  
  // Process content: resolve image references and handle legacy data URIs
  const { processedContent, imageMap } = useMemo(() => {
    const map = new Map<string, { src: string; alt: string }>();
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
        // Update last used timestamp
        updateLastUsed(id);
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

    return { processedContent: processed, imageMap: map };
  }, [content, getImageData, updateLastUsed]);

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
      // Check if this is a placeholder we created
      if (src && src.startsWith('IMAGE_PLACEHOLDER_')) {
        const imageData = imageMap.get(src);
        if (imageData) {
          console.log('Rendering extracted image:', {
            alt: imageData.alt,
            srcLength: imageData.src.length,
            placeholder: src,
          });
          return (
            <div className="my-4">
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
                  console.log('Extracted image loaded successfully');
                }}
              />
            </div>
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
        return (
          <div className="my-4">
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
                console.log('Image loaded successfully');
              }}
              {...props}
            />
          </div>
        );
      }
      
      // Handle regular URLs
      return (
        <div className="my-4">
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
        </div>
      );
    },
    a({ node, href, children, ...props }) {
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
    <div className={`prose prose-sm dark:prose-invert max-w-none ${className || ''}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}

