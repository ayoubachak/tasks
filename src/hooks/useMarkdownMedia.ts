import { useMemo } from 'react';
import { useMediaStore } from '@/stores';

export function useMarkdownMedia(content: string): {
  processedContent: string;
  imageMap: Map<string, { src: string; alt: string }>;
  audioMap: Map<string, { src: string; title: string; mimeType?: string }>;
  videoMap: Map<string, { src: string; title: string; mimeType?: string; poster?: string }>;
  usedMediaIds: string[];
} {
  const getMedia = useMediaStore((state) => state.getMedia);
  const getMediaData = useMediaStore((state) => state.getMediaData);

  return useMemo(() => {
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
}

