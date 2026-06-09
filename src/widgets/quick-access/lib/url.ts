export function normalizeUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const withProtocol = /^[a-z]+:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withProtocol).toString();
  } catch {
    return null;
  }
}

export function keyOf(url: string): string {
  return normalizeUrl(url) ?? url;
}

export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function monogram(url: string): string {
  const host = hostnameOf(url);
  return (host[0] ?? "?").toUpperCase();
}

export function hashHue(url: string): number {
  const host = hostnameOf(url);
  let hash = 0;
  for (let i = 0; i < host.length; i += 1) {
    hash = (hash * 31 + host.charCodeAt(i)) >>> 0;
  }
  return hash % 360;
}
