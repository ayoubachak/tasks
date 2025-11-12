import { useCallback } from 'react';

export interface PasteImageResult {
  data: string; // base64
  mimeType: string;
  filename: string;
  size: number;
  width?: number;
  height?: number;
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_IMAGE_DIMENSION = 4096; // Max width/height

/**
 * Custom hook for handling image paste from clipboard
 * No external dependencies - uses native Clipboard API
 */
export function useImagePaste(
  onImagePaste: (image: PasteImageResult) => void,
  options?: {
    maxSize?: number;
    maxDimension?: number;
    compress?: boolean;
  }
) {
  const maxSize = options?.maxSize ?? MAX_IMAGE_SIZE;
  const maxDimension = options?.maxDimension ?? MAX_IMAGE_DIMENSION;
  const compress = options?.compress ?? true;

  const compressImage = useCallback(
    (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let { width, height } = img;

            // Resize if too large
            if (width > maxDimension || height > maxDimension) {
              const ratio = Math.min(maxDimension / width, maxDimension / height);
              width = Math.round(width * ratio);
              height = Math.round(height * ratio);
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('Could not get canvas context'));
              return;
            }

            ctx.drawImage(img, 0, 0, width, height);

            // Convert to base64 with quality compression
            const quality = compress ? 0.8 : 1.0;
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(new Error('Failed to compress image'));
                  return;
                }
                const reader = new FileReader();
                reader.onload = () => {
                  resolve(reader.result as string);
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              },
              file.type,
              quality
            );
          };
          img.onerror = reject;
          img.src = e.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    },
    [maxDimension, compress]
  );

  const handlePaste = useCallback(
    async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        if (item.type.indexOf('image') !== -1) {
          e.preventDefault();
          const file = item.getAsFile();
          if (!file) continue;

          // Check file size
          if (file.size > maxSize) {
            alert(`Image too large. Maximum size is ${maxSize / 1024 / 1024}MB`);
            continue;
          }

          try {
            let base64: string;
            let width: number | undefined;
            let height: number | undefined;

            if (compress) {
              base64 = await compressImage(file);
              // Get dimensions from compressed image
              const img = new Image();
              await new Promise<void>((resolve, reject) => {
                img.onload = () => {
                  width = img.width;
                  height = img.height;
                  resolve();
                };
                img.onerror = reject;
                img.src = base64;
              });
            } else {
              const reader = new FileReader();
              base64 = await new Promise<string>((resolve, reject) => {
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
              });

              // Get dimensions
              const img = new Image();
              await new Promise<void>((resolve, reject) => {
                img.onload = () => {
                  width = img.width;
                  height = img.height;
                  resolve();
                };
                img.onerror = reject;
                img.src = base64;
              });
            }

            const result: PasteImageResult = {
              data: base64,
              mimeType: file.type,
              filename: file.name || `pasted-image-${Date.now()}.png`,
              size: file.size,
              width,
              height,
            };

            onImagePaste(result);
          } catch (error) {
            console.error('Error processing pasted image:', error);
            alert('Failed to process image. Please try again.');
          }
        }
      }
    },
    [onImagePaste, maxSize, compress, compressImage]
  );

  return {
    handlePaste,
  };
}

