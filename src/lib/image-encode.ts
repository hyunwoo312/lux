const WEBP_MIME = "image/webp";
const PASSTHROUGH_MIMES = new Set([WEBP_MIME, "image/gif"]);

export type EncodeOptions = { quality: number; maxDimension?: number };

export function scaledDimensions(
  width: number,
  height: number,
  maxDimension: number,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxDimension) return { width, height };
  const scale = maxDimension / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export function isOptimizedMimeType(mimeType: string): boolean {
  return PASSTHROUGH_MIMES.has(mimeType);
}

async function encodeBitmap(
  bitmap: ImageBitmap,
  width: number,
  height: number,
  quality: number,
): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.drawImage(bitmap, 0, 0, width, height);
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), WEBP_MIME, quality));
}

export async function encodeToWebp(file: Blob, options: EncodeOptions): Promise<Blob> {
  if (isOptimizedMimeType(file.type)) return file;
  if (typeof createImageBitmap !== "function") return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  try {
    const { width, height } = options.maxDimension
      ? scaledDimensions(bitmap.width, bitmap.height, options.maxDimension)
      : { width: bitmap.width, height: bitmap.height };
    const encoded = await encodeBitmap(bitmap, width, height, options.quality);
    if (!encoded) return file;
    const resized = width !== bitmap.width || height !== bitmap.height;
    return !resized && encoded.size >= file.size ? file : encoded;
  } catch {
    return file;
  } finally {
    bitmap.close();
  }
}
