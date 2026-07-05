const FETCH_TIMEOUT_MS = 10_000;
const MAX_FETCH_BYTES = 5_000_000;

type FetchTextResult = { ok: true; text: string } | { ok: false; status?: number; error?: string };

async function readCapped(response: Response, maxBytes: number): Promise<string | null> {
  const reader = response.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(merged);
}

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason !== "update") return;
  void chrome.storage.local.set({
    "lux:changelog-pending": chrome.runtime.getManifest().version,
  });
});

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (
    typeof message === "object" &&
    message !== null &&
    (message as { type?: unknown }).type === "lux:fetch-text" &&
    typeof (message as { url?: unknown }).url === "string"
  ) {
    void fetchText((message as { url: string }).url).then(sendResponse);
    return true;
  }
  return undefined;
});

async function fetchText(url: string): Promise<FetchTextResult> {
  if (!url.startsWith("https://")) return { ok: false, error: "Unsupported URL" };
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!response.ok) return { ok: false, status: response.status };
    const text = await readCapped(response, MAX_FETCH_BYTES);
    if (text === null) return { ok: false, error: "Response too large" };
    return { ok: true, text };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Request failed" };
  }
}
