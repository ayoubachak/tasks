import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { Components } from 'react-markdown';
import { MermaidDiagram } from './MermaidDiagram';

interface MediaMaps {
  imageMap: Map<string, { src: string; alt: string }>;
  audioMap: Map<string, { src: string; title: string; mimeType?: string }>;
  videoMap: Map<string, { src: string; title: string; mimeType?: string; poster?: string }>;
}

export function createMarkdownComponents(mediaMaps: MediaMaps): Components {
  const { imageMap, audioMap, videoMap } = mediaMaps;

  return {
    h1({ node, children, ...props }) {
      return <h1 {...props}>{children}</h1>;
    },
    h2({ node, children, ...props }) {
      return <h2 {...props}>{children}</h2>;
    },
    h3({ node, children, ...props }) {
      return <h3 {...props}>{children}</h3>;
    },
    h4({ node, children, ...props }) {
      return <h4 {...props}>{children}</h4>;
    },
    h5({ node, children, ...props }) {
      return <h5 {...props}>{children}</h5>;
    },
    h6({ node, children, ...props }) {
      return <h6 {...props}>{children}</h6>;
    },
    p({ node, children, ...props }) {
      return <p {...props}>{children}</p>;
    },
    ul({ node, children, ...props }) {
      return <ul {...props}>{children}</ul>;
    },
    ol({ node, children, ...props }) {
      return <ol {...props}>{children}</ol>;
    },
    li({ node, children, ...props }) {
      return <li {...props}>{children}</li>;
    },
    blockquote({ node, children, ...props }) {
      return <blockquote {...props}>{children}</blockquote>;
    },
    code({ inline, className: codeClassName, children, ...props }: any) {
      const match = /language-(\w+)/.exec(codeClassName || '');
      const language = match ? match[1] : '';
      const codeString = String(children).replace(/\n$/, '');
      
      // Handle Mermaid diagrams
      if (!inline && language === 'mermaid') {
        return <MermaidDiagram code={codeString} />;
      }
      
      return !inline && match ? (
        <SyntaxHighlighter
          style={oneDark as any}
          language={language}
          PreTag="div"
          customStyle={{
            margin: 0,
            padding: '16px',
            borderRadius: '6px',
            fontSize: '85%',
            lineHeight: 1.45,
          }}
          {...props}
        >
          {codeString}
        </SyntaxHighlighter>
      ) : (
        <code {...props}>
          {children}
        </code>
      );
    },
    img({ node, src, alt, ...props }) {
      if (src && src.startsWith('AUDIO_PLACEHOLDER_')) {
        const audioData = audioMap.get(src);
        if (audioData) {
          return (
            <div style={{ marginTop: '16px', marginBottom: '16px' }}>
              <audio controls className="w-full max-w-md" preload="metadata">
                <source src={audioData.src} type={audioData.mimeType ?? undefined} />
                Your browser does not support the audio element.
              </audio>
              {audioData.title && (
                <p className="text-xs text-muted-foreground" style={{ marginTop: '4px' }}>{audioData.title}</p>
              )}
            </div>
          );
        }
        return (
          <p style={{ marginTop: '16px', marginBottom: '16px' }} className="text-sm text-muted-foreground">
            Audio file unavailable.
          </p>
        );
      }

      if (src && src.startsWith('VIDEO_PLACEHOLDER_')) {
        const videoData = videoMap.get(src);
        if (videoData) {
          return (
            <div style={{ marginTop: '16px', marginBottom: '16px' }}>
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
                <p className="text-xs text-muted-foreground" style={{ marginTop: '4px' }}>{videoData.title}</p>
              )}
            </div>
          );
        }
        return (
          <p style={{ marginTop: '16px', marginBottom: '16px' }} className="text-sm text-muted-foreground">
            Video file unavailable.
          </p>
        );
      }

      // Check if this is a placeholder we created
      if (src && src.startsWith('IMAGE_PLACEHOLDER_')) {
        const imageData = imageMap.get(src);
        if (imageData) {
          return (
            <img
              src={imageData.src}
              alt={imageData.alt || 'Image'}
              className="max-w-full rounded-lg border shadow-sm"
              loading="lazy"
              onError={(e) => {
                console.error('Failed to load extracted image');
                e.currentTarget.style.display = 'none';
              }}
            />
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
          <img
            src={src}
            alt={alt || 'Image'}
            className="max-w-full rounded-lg border shadow-sm"
            loading="lazy"
            onError={(e) => {
              console.error('Failed to load image');
              e.currentTarget.style.display = 'none';
            }}
            {...props}
          />
        );
      }
      
      // Handle regular URLs
      return (
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
      );
    },
    a({ node, href, children, ...props }) {
      if (href && href.startsWith('AUDIO_PLACEHOLDER_')) {
        const audioData = audioMap.get(href);
        if (audioData) {
          return (
            <div style={{ marginTop: '16px', marginBottom: '16px' }}>
              <audio controls className="w-full max-w-md" preload="metadata">
                <source src={audioData.src} type={audioData.mimeType ?? undefined} />
                Your browser does not support the audio element.
              </audio>
              {audioData.title && (
                <p className="text-xs text-muted-foreground" style={{ marginTop: '4px' }}>{audioData.title}</p>
              )}
            </div>
          );
        }
        return (
          <p style={{ marginTop: '16px', marginBottom: '16px' }} className="text-sm text-muted-foreground">
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
}

