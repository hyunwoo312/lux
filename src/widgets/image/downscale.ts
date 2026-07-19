export const IMAGE_MAX_DIMENSION = 2560;
export const IMAGE_ENCODE_QUALITY = 0.85;
export const REENCODED_MIME = "image/webp";

export function shouldReencode(mimeType: string, longestEdge: number): boolean {
  if (mimeType === "image/gif") return false;
  return longestEdge > IMAGE_MAX_DIMENSION;
}

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

async function encodeBitmap(
  bitmap: ImageBitmap,
  width: number,
  height: number,
): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.drawImage(bitmap, 0, 0, width, height);
  return new Promise((resolve) =>
    canvas.toBlob((blob) => resolve(blob), REENCODED_MIME, IMAGE_ENCODE_QUALITY),
  );
}

export async function downscaleImage(file: File): Promise<Blob> {
  if (file.type === "image/gif") return file;
  if (typeof createImageBitmap !== "function") return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  try {
    if (!shouldReencode(file.type, Math.max(bitmap.width, bitmap.height))) return file;
    const { width, height } = scaledDimensions(bitmap.width, bitmap.height, IMAGE_MAX_DIMENSION);
    const blob = await encodeBitmap(bitmap, width, height);
    return blob ?? file;
  } finally {
    bitmap.close();
  }
}
