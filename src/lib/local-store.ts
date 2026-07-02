export function getLocal(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function setLocal(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

export function removeLocal(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {}
}
