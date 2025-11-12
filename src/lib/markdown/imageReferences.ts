import { createImageReference, extractImageId, isImageReference } from '@/stores/imageStore';

/**
 * Replace image references in markdown with short references
 * Example: ![alt](data:image/png;base64,...) -> ![alt](image:abc123)
 */
export function replaceDataUrisWithReferences(markdown: string, storeImage: (dataUri: string) => string): string {
  // Match markdown image syntax with data URIs
  const imageRegex = /!\[([^\]]*)\]\((data:[^)]+)\)/g;
  
  return markdown.replace(imageRegex, (match, alt, dataUri) => {
    // Store the image and get its ID
    const imageId = storeImage(dataUri);
    // Return markdown with short reference
    return `![${alt}](${createImageReference(imageId)})`;
  });
}

/**
 * Extract all image references from markdown
 */
export function extractImageReferences(markdown: string): string[] {
  const references: string[] = [];
  const imageRegex = /!\[([^\]]*)\]\((image:[^)]+)\)/g;
  
  let match;
  while ((match = imageRegex.exec(markdown)) !== null) {
    const ref = match[2];
    if (isImageReference(ref)) {
      const id = extractImageId(ref);
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
  const imageRegex = /!\[([^\]]*)\]\((image:([^)]+))\)/g;
  
  return markdown.replace(imageRegex, (match, alt, ref, id) => {
    const dataUri = getImageData(id);
    if (dataUri) {
      return `![${alt}](${dataUri})`;
    }
    // If image not found, keep the reference (or show broken image)
    return match;
  });
}

