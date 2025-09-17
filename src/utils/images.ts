/**
 * Resize an image data-URL to target size and return a PNG data-URL.
 */
export async function resizeDataUrlImage(
  dataUrl: string,
  targetSize: number,
  { mode = "contain" } = {}
) {
  const img = await loadImageFromDataUrl(dataUrl);

  const target = targetSize;
  const canvas = document.createElement("canvas");
  canvas.width = target;
  canvas.height = target;
  const ctx = canvas.getContext("2d", { willReadFrequently: false });
  if (!ctx) throw new Error("Failed to create canvas");

  // High-quality scaling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  if (mode === "cover") {
    // Center-crop to a square, then scale to 128x128
    const side = Math.min(img.width, img.height);
    const sx = Math.floor((img.width - side) / 2);
    const sy = Math.floor((img.height - side) / 2);
    ctx.clearRect(0, 0, target, target);
    ctx.drawImage(img, sx, sy, side, side, 0, 0, target, target);
  } else {
    // "contain": preserve aspect ratio, pad with transparency as needed
    const scale = Math.min(target / img.width, target / img.height);
    const dw = Math.round(img.width * scale);
    const dh = Math.round(img.height * scale);
    const dx = Math.floor((target - dw) / 2);
    const dy = Math.floor((target - dh) / 2);
    ctx.clearRect(0, 0, target, target);
    ctx.drawImage(img, 0, 0, img.width, img.height, dx, dy, dw, dh);
  }

  // Return PNG data-URL (base64)
  return canvas.toDataURL("image/png");
}

async function loadImageFromDataUrl(dataUrl: string) {
  // Fast path when supported: decode via createImageBitmap
  try {
    if ("createImageBitmap" in window) {
      const blob = await (await fetch(dataUrl)).blob();
      const bitmap = await createImageBitmap(blob);
      // Wrap ImageBitmap in an Image-like object for drawImage (supported directly)
      return bitmap; // drawImage accepts ImageBitmap
    }
  } catch (_) {
    /* fall back below */
  }

  // Fallback: use HTMLImageElement
  const img = new Image();
  img.decoding = "async";
  img.src = dataUrl;
  await img.decode?.().catch(
    () =>
      new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = (e) => rej(e);
      })
  );
  return img;
}


/**
 * Convert a data URL to an object URL for better memory management
 */
export function dataUrlToObjectUrl(dataUrl: string): string {
  try {
    // Convert data URL to blob
    const [header, data] = dataUrl.split(',');
    const mime = header.match(/:(.*?);/)?.[1] || 'image/png';
    const binary = atob(data);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([array], { type: mime });
    
    // Create object URL
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Error converting data URL to object URL:', error);
    return dataUrl; // Fallback to original data URL
  }
}

/**
 * Check if a URL is a data URL
 */
export function isDataUrl(url: string): boolean {
  return url.startsWith('data:');
}

/**
 * Process image URLs for storage optimization.
 * Converts data URLs to object URLs to use native browser capability.
 */
export function processImagesForStorage(images: string[]): string[] {
  return images.map(imageUrl => {
    if (isDataUrl(imageUrl)) {
      return dataUrlToObjectUrl(imageUrl);
    }
    return imageUrl;
  });
}

/**
 * Cleanup object URLs to prevent memory leaks
 */
export function cleanupObjectUrls(images: string[]): void {
  images.forEach(imageUrl => {
    if (imageUrl.startsWith('blob:')) {
      URL.revokeObjectURL(imageUrl);
    }
  });
}
