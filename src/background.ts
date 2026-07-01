const FETCH_TIMEOUT_MS = 10_000;

type FetchTextResult = { ok: true; text: string } | { ok: false; status?: number; error?: string };

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
    return { ok: true, text: await response.text() };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Request failed" };
  }
}
