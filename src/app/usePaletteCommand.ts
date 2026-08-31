import { useEffect } from "react";
import { PALETTE_PARAM, openPaletteMessageSchema } from "@/lib/extension-keys";
import { useCommandPaletteStore } from "@/palette";
import { closeOpenDialogs } from "@/app/useGlobalShortcuts";

function openOverAnything(): void {
  closeOpenDialogs();
  useCommandPaletteStore.getState().openPalette();
}

export function usePaletteCommand(): void {
  useEffect(() => {
    if (new URLSearchParams(location.search).has(PALETTE_PARAM)) {
      openOverAnything();
      history.replaceState(null, "", location.pathname);
    }

    if (typeof chrome === "undefined" || !chrome.runtime?.onMessage || !chrome.tabs) return;

    let tabId: number | undefined;
    void chrome.tabs.getCurrent().then((tab) => {
      tabId = tab?.id;
    });

    function onMessage(
      message: unknown,
      _sender: chrome.runtime.MessageSender,
      respond: (handled: boolean) => void,
    ): undefined {
      const parsed = openPaletteMessageSchema.safeParse(message);
      if (!parsed.success || parsed.data.activeTabId !== tabId) return undefined;
      const palette = useCommandPaletteStore.getState();
      if (palette.open) palette.closePalette();
      else openOverAnything();
      respond(true);
      return undefined;
    }

    chrome.runtime.onMessage.addListener(onMessage);
    return () => chrome.runtime.onMessage.removeListener(onMessage);
  }, []);
}
