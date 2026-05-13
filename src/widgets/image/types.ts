export const IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;
export type ImageMimeType = (typeof IMAGE_MIME_TYPES)[number];

export const IMAGE_FIT_MODES = ["cover", "contain", "fill", "scale-down"] as const;
export type ImageFit = (typeof IMAGE_FIT_MODES)[number];

export const IMAGE_BRIGHTNESS_MODES = ["normal", "dim", "dark"] as const;
export type ImageBrightness = (typeof IMAGE_BRIGHTNESS_MODES)[number];

export const IMAGE_MODES = ["single", "multi"] as const;
export type ImageMode = (typeof IMAGE_MODES)[number];

export const IMAGE_ORDER_MODES = ["shuffle", "sequential"] as const;
export type ImageOrder = (typeof IMAGE_ORDER_MODES)[number];

export const MIN_INTERVAL_SECONDS = 15;
export const MAX_INTERVAL_SECONDS = 300;
export const MAX_MULTI_IMAGES = 10;
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export type ImageItem = {
  assetId: string;
  fileName: string;
  mimeType: string;
  size: number;
};
