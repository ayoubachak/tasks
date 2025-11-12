import { useState, useCallback } from 'react';
import type { PasteImageResult } from './useImagePaste';

/**
 * Custom hook for managing Markdown content with image support
 * Handles inserting images into markdown at cursor position
 */
export function useMarkdown(initialContent = '') {
  const [content, setContent] = useState(initialContent);

  const insertImage = useCallback((image: PasteImageResult, altText = '') => {
    setContent((prev) => {
      // Ensure we have valid image data
      if (!image.data || image.data.trim() === '') {
        console.warn('Invalid image data provided');
        return prev;
      }
      
      // Create markdown image syntax with proper formatting
      const alt = altText || image.filename || 'Image';
      const imageMarkdown = `\n\n![${alt}](${image.data})\n\n`;
      
      // Insert at end of content
      return prev ? `${prev}${imageMarkdown}` : imageMarkdown.trim();
    });
  }, []);

  const insertAtCursor = useCallback((text: string, cursorPosition?: number) => {
    setContent((prev) => {
      if (cursorPosition === undefined) {
        return prev + text;
      }
      return prev.slice(0, cursorPosition) + text + prev.slice(cursorPosition);
    });
  }, []);

  const updateContent = useCallback((newContent: string) => {
    setContent(newContent);
  }, []);

  return {
    content,
    setContent: updateContent,
    insertImage,
    insertAtCursor,
  };
}

