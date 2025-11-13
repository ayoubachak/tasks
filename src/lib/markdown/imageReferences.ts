import { createMediaReference, extractMediaId, isMediaReference } from '@/stores/mediaStore';
import type { MediaType } from '@/stores/mediaStore';

/**
 * Replace image references in markdown with short references
 * Example: ![alt](data:image/png;base64,...) -> ![alt](image:abc123)
 */
export function replaceDataUrisWithReferences(
  markdown: string,
  storeMedia: (input: {
    type: MediaType;
    data: string;
    mimeType: string;
    filename: string;
    size: number;
  }) => string
): string {
  // Match markdown image syntax with data URIs
  const imageRegex = /!\[([^\]]*)\]\((data:[^)]+)\)/g;
  
  return markdown.replace(imageRegex, (_match, alt, dataUri) => {
    // Store the image and get its ID
    const imageId = storeMedia({
      type: 'image',
      data: dataUri,
      mimeType: extractMimeType(dataUri) ?? 'image/png',
      filename: generateFilename('image'),
      size: estimateBase64Size(dataUri),
    });
    // Return markdown with short reference
    return `![${alt}](${createMediaReference(imageId)})`;
  });
}

/**
 * Extract all image references from markdown
 */
export function extractImageReferences(markdown: string): string[] {
  const references: string[] = [];
  const imageRegex = /!\[([^\]]*)\]\((media:[^)]+)\)/g;
  
  let match;
  while ((match = imageRegex.exec(markdown)) !== null) {
    const ref = match[2];
    if (isMediaReference(ref)) {
      const id = extractMediaId(ref);
      if (id) {
        references.push(id);
      }
    }
  }
  
  return references;
}

/**
 * Replace image references with actual data URIs for rendering
 */
export function replaceReferencesWithDataUris(
  markdown: string,
  getImageData: (id: string) => string | undefined
): string {
  const imageRegex = /!\[([^\]]*)\]\(((?:media|image):([^)]+))\)/g;
  
  return markdown.replace(imageRegex, (_match, alt, _ref, id) => {
    const dataUri = getImageData(id);
    if (dataUri) {
      return `![${alt}](${dataUri})`;
    }
    // If image not found, keep the reference (or show broken image)
    return _match;
  });
}

function extractMimeType(dataUri: string): string | null {
  const match = /^data:([^;]+);/i.exec(dataUri);
  return match ? match[1] : null;
}

function estimateBase64Size(dataUri: string): number {
  const base64 = dataUri.split(',')[1] ?? '';
  return Math.ceil((base64.length * 3) / 4);
}

function generateFilename(type: 'image' | 'photo' | 'video' | 'audio'): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${type}-${timestamp}.bin`;
}
