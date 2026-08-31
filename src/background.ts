import {
  ANILIST_CALLBACK_KEY,
  CHANGELOG_PENDING_KEY,
  OPEN_PALETTE_COMMAND,
  PALETTE_PARAM,
  anilistCallbackSchema,
  type AnilistCallback,
  type OpenPaletteMessage,
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

chrome.commands.onCommand.addListener((command, tab) => {
  if (command !== OPEN_PALETTE_COMMAND || tab?.id === undefined) return;
  void routePalette(tab.id);
});

async function routePalette(activeTabId: number): Promise<void> {
  const message: OpenPaletteMessage = { type: "open-palette", activeTabId };
  const handled = await chrome.runtime.sendMessage(message).catch(() => undefined);
  if (handled === true) return;
  await chrome.tabs.create({ url: chrome.runtime.getURL(`index.html?${PALETTE_PARAM}=1`) });
}
