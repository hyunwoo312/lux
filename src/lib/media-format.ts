export function getImageTypeLabel(mimeType: string | null): string | null {
  if (!mimeType) return null;
  const subtype = mimeType.split("/")[1];
  return subtype ? subtype.replace("jpeg", "jpg").toUpperCase() : null;
}

export function formatFileSize(size: number | null): string | null {
  if (size === null) return null;
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(size < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}

export function getMetadataLabel(mimeType: string | null, size: number | null): string | null {
  const parts = [getImageTypeLabel(mimeType), formatFileSize(size)].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}
