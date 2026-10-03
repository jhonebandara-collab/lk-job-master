/**
 * Client-side image compressor using HTML Canvas
 * Resizes large smartphone/scanner images (e.g. 10MB+) down to ~200-400KB
 * ensuring lightning fast uploads and preventing Gemini 503/timeout issues.
 */
export async function compressImageFile(
  file: File,
  maxDimension = 1400,
  quality = 0.85
): Promise<{ base64: string; mimeType: string }> {
  if (!file.type.startsWith('image/')) {
    // Non-image file, return standard base64
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ base64: reader.result as string, mimeType: file.type });
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate aspect-ratio preserved dimensions
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // Fallback if canvas context fails
          resolve({ base64: e.target?.result as string, mimeType: file.type });
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve({ base64: compressedBase64, mimeType: 'image/jpeg' });
      };

      img.onerror = () => {
        // Fallback to original
        resolve({ base64: e.target?.result as string, mimeType: file.type });
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      resolve({ base64: '', mimeType: file.type });
    };

    reader.readAsDataURL(file);
  });
}
