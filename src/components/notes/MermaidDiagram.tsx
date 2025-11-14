import { useEffect, useRef, useState, useMemo } from 'react';
import mermaid from 'mermaid';

interface MermaidDiagramProps {
  code: string;
}

// Generate stable ID from code content
const generateId = (code: string): string => {
  let hash = 0;
  for (let i = 0; i < code.length; i++) {
    const char = code.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `mermaid-${Math.abs(hash).toString(36)}`;
};

export function MermaidDiagram({ code }: MermaidDiagramProps) {
  const mermaidRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const renderingRef = useRef(false);
  const diagramId = useMemo(() => generateId(code), [code]);
  
  const [isDark, setIsDark] = useState(() => 
    document.documentElement.classList.contains('dark')
  );

  // Listen for theme changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!mermaidRef.current) return;

    let isCancelled = false;
    const currentId = diagramId;

    // Initialize Mermaid with current theme
    mermaid.initialize({
      startOnLoad: false,
      theme: isDark ? 'dark' : 'default',
      securityLevel: 'loose',
      fontFamily: 'inherit',
    });

    renderingRef.current = true;
    setError(null);
    setSvgContent(null);

    // Render the diagram
    mermaid
      .render(currentId, code)
      .then((result) => {
        // Only update if this is still the current render and component is mounted
        if (!isCancelled && mermaidRef.current && diagramId === currentId) {
          setSvgContent(result.svg);
          renderingRef.current = false;
        }
      })
      .catch((err) => {
        // Only update if this is still the current render
        if (!isCancelled && diagramId === currentId) {
          console.error('Mermaid rendering error:', err);
          setError(err.message || 'Failed to render diagram');
          renderingRef.current = false;
        }
      });

    return () => {
      isCancelled = true;
      renderingRef.current = false;
    };
  }, [code, isDark, diagramId]);

  // Update innerHTML when svgContent changes
  useEffect(() => {
    if (mermaidRef.current && svgContent) {
      mermaidRef.current.innerHTML = svgContent;
    }
  }, [svgContent]);

  if (error) {
    return (
      <div className="mermaid-diagram my-4">
        <pre className="text-red-500 text-sm p-4 bg-red-50 dark:bg-red-950 rounded">
          Mermaid Error: {error}
        </pre>
      </div>
    );
  }

  if (!svgContent) {
    return (
      <div
        ref={mermaidRef}
        className="mermaid-diagram my-4 flex items-center justify-center"
        style={{ minHeight: '100px' }}
      >
        <div className="text-muted-foreground text-sm">Rendering diagram...</div>
      </div>
    );
  }

  return (
    <div
      ref={mermaidRef}
      className="mermaid-diagram my-4 flex items-center justify-center"
      style={{ minHeight: '100px' }}
    />
  );
}

