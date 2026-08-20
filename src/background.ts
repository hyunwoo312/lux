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

chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
  if (
    typeof message === "object" &&
    message !== null &&
    (message as { type?: unknown }).type === "anilist-oauth"
  ) {
    const { accessToken, tokenType, expiresIn, state, error } = message as AnilistCallback;
    void stashAnilistCallback({ accessToken, tokenType, expiresIn, state, error }, sender.tab?.id);
    sendResponse({ received: true });
    return undefined;
  }

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
