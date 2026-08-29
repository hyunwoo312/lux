import {
  ANILIST_CALLBACK_KEY,
  CHANGELOG_PENDING_KEY,
  anilistCallbackSchema,
  type AnilistCallback,
} from "@/lib/extension-keys";

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason !== "update") return;
  void chrome.storage.local
    .set({ [CHANGELOG_PENDING_KEY]: chrome.runtime.getManifest().version })
    .catch(() => undefined);
});

chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
  const callback = anilistCallbackSchema.safeParse(message);
  if (!callback.success) return undefined;

  void stashAnilistCallback(callback.data, sender.tab?.id);
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
