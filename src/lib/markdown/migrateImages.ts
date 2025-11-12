import { useImageStore, createImageReference, isImageReference } from '@/stores';

/**
 * Migrate legacy data URIs in markdown to image references
 * This can be called when loading old content to convert it to the new format
 */
export function migrateDataUrisToReferences(markdown: string, storeImage: (dataUri: string) => string): string {
  // Find all data URI images
  const dataUriRegex = /!\[([^\]]*)\]\((data:[^)]+)\)/g;
  const matches: Array<{ full: string; alt: string; dataUri: string }> = [];
  
  let match;
  while ((match = dataUriRegex.exec(markdown)) !== null) {
    // Skip if already a reference
    if (isImageReference(match[2])) {
      continue;
    }
    
    matches.push({
      full: match[0],
      alt: match[1] || 'Image',
      dataUri: match[2],
    });
  }

  // Replace in reverse order to preserve indices
  let migrated = markdown;
  for (let i = matches.length - 1; i >= 0; i--) {
    const m = matches[i];
    const imageId = storeImage(m.dataUri, 'image/png', `migrated-${Date.now()}.png`, m.dataUri.length);
    const reference = createImageReference(imageId);
    migrated = migrated.replace(m.full, `![${m.alt}](${reference})`);
  }

  return migrated;
}

/**
 * Extract all image references from markdown for cleanup purposes
 */
export function extractImageReferences(markdown: string): string[] {
  const references: string[] = [];
  const referenceRegex = /!\[([^\]]*)\]\((image:([^)]+))\)/g;
  
  let match;
  while ((match = referenceRegex.exec(markdown)) !== null) {
    references.push(match[3]); // image ID
  }
  
  return references;
}

