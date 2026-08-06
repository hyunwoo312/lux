import { useMemo } from "react";
import { openUrl } from "@/lib/open-url";
import { restoreSession } from "@/widgets/quick-access/browser";
import { keyOf } from "@/widgets/quick-access/lib/url";
import type { BrowserItem } from "@/widgets/quick-access/types";
import { useQuickAccess, useQuickAccessStore } from "@/widgets/quick-access/useQuickAccessStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";

type ItemActions = {
  pinnedUrls: Set<string>;
  open: (item: BrowserItem) => void;
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
    open: (item) => {
      if (!item.sessionId) {
        openUrl(item.url, openBehavior);
        return;
      }
      void restoreSession(item.sessionId).then((restored) => {
        if (!restored) openUrl(item.url, openBehavior);
      });
    },
    togglePin: (item) => toggle(instanceId, item.title, item.url),
  };
}
