const WEBP_MIME = "image/webp";
const PASSTHROUGH_MIMES = new Set([WEBP_MIME, "image/gif"]);

export type EncodeOptions = { quality: number; maxDimension?: number };

type RenderBitmapOptions = {
  maxEdge: number;
  filter?: (scale: number) => string;
  type: string;
  quality: number;
};

type RenderedBitmap = { blob: Blob; resized: boolean };

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

export async function renderBitmap(
  source: Blob,
  { maxEdge, filter, type, quality }: RenderBitmapOptions,
): Promise<RenderedBitmap | null> {
  if (typeof createImageBitmap !== "function") return null;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(source);
  } catch {
    return null;
  }

  try {
    const { width, height } = scaledDimensions(bitmap.width, bitmap.height, maxEdge);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return null;
    if (filter) context.filter = filter(width / bitmap.width);
    context.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((result) => resolve(result), type, quality),
    );
    if (!blob) return null;
    return { blob, resized: width !== bitmap.width || height !== bitmap.height };
  } catch {
    return null;
  } finally {
    bitmap.close();
  }
}

export async function encodeToWebp(file: Blob, options: EncodeOptions): Promise<Blob> {
  if (isOptimizedMimeType(file.type)) return file;
  const rendered = await renderBitmap(file, {
    maxEdge: options.maxDimension ?? Infinity,
    type: WEBP_MIME,
    quality: options.quality,
  });
  if (!rendered) return file;
  return !rendered.resized && rendered.blob.size >= file.size ? file : rendered.blob;
}
