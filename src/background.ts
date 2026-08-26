const ANILIST_CALLBACK_KEY = "lux:anilist-callback";

type AnilistCallback = {
  accessToken?: string;
  tokenType?: string;
  expiresIn?: string;
  state?: string;
  error?: string;
};

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason !== "update") return;
  void chrome.storage.local.set({
    "lux:changelog-pending": chrome.runtime.getManifest().version,
  });
});

function anilistCallbackFrom(message: unknown): AnilistCallback | null {
  if (typeof message !== "object" || message === null) return null;
  const fields = message as Record<string, unknown>;
  if (fields.type !== "anilist-oauth") return null;

  const text = (name: keyof AnilistCallback) =>
    typeof fields[name] === "string" ? fields[name] : undefined;

  return {
    accessToken: text("accessToken"),
    tokenType: text("tokenType"),
    expiresIn: text("expiresIn"),
    state: text("state"),
    error: text("error"),
  };
}

chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
  const callback = anilistCallbackFrom(message);
  if (!callback) return undefined;

  void stashAnilistCallback(callback, sender.tab?.id);
  sendResponse({ received: true });
  return undefined;
});

async function stashAnilistCallback(
  callback: AnilistCallback,
  tabId: number | undefined,
): Promise<void> {
  await chrome.storage.session.set({ [ANILIST_CALLBACK_KEY]: callback }).catch(() => undefined);
  if (tabId === undefined) return;
  await chrome.tabs.remove(tabId).catch(() => undefined);
}
