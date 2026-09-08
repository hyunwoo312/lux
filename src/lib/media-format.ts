function getImageTypeLabel(mimeType: string | null): string | null {
  if (!mimeType) return null;
  const subtype = mimeType.split("/")[1];
  return subtype ? subtype.replace("jpeg", "jpg").toUpperCase() : null;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1000) return `${Math.round(kb)} KB`;
  const mb = kb / 1024;
  return `${mb < 10 ? Number(mb.toFixed(1)) : Math.round(mb)} MB`;
}

export function getMetadataLabel(mimeType: string | null, size: number | null): string | null {
  const parts = [getImageTypeLabel(mimeType), size === null ? null : formatBytes(size)].filter(
    Boolean,
  );
  return parts.length ? parts.join(" · ") : null;
}
