import type { MouseEvent } from "react";
import { useMemo } from "react";
import { openUrl } from "@/lib/open-url";
import { focusTab, restoreSession } from "@/lib/browser";
import { keyOf } from "@/widgets/quick-access/lib/url";
import type { BrowserItem, OpenBehavior } from "@/widgets/quick-access/types";
import { useQuickAccess, useQuickAccessStore } from "@/widgets/quick-access/useQuickAccessStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";

type ItemActions = {
  pinnedUrls: Set<string>;
  openBehavior: OpenBehavior;
  open: (item: BrowserItem, event?: MouseEvent<HTMLElement>) => void;
  togglePin: (item: BrowserItem) => void;
};

export function useItemActions(): ItemActions {
  const instanceId = useWidgetInstanceId();
  const openBehavior = useQuickAccess((d) => d.openBehavior);
  const links = useQuickAccess((d) => d.links);
  const toggle = useQuickAccessStore((s) => s.togglePin);
  const pinnedUrls = useMemo(() => new Set(links.map((link) => keyOf(link.url))), [links]);

  return {
    pinnedUrls,
    openBehavior,
    open: (item, event) => {
      const modified =
        event !== undefined &&
        (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0);
      if (modified) return;

      if (item.tabId !== undefined && item.windowId !== undefined) {
        event?.preventDefault();
        void focusTab(item.tabId, item.windowId);
        return;
      }

      if (!item.sessionId) return;
      event?.preventDefault();
      void restoreSession(item.sessionId).then((restored) => {
        if (!restored) openUrl(item.url, openBehavior);
      });
    },
    togglePin: (item) => toggle(instanceId, item.title, item.url),
  };
}
