import { useMemo } from "react";
import { PermissionPrompt } from "@/components/PermissionPrompt";
import { usePermissionGranted } from "@/hooks/usePermission";
import { isPermissionsManageable } from "@/lib/permissions";
import { useSettingsStore } from "@/settings";
import { BrowserList } from "@/widgets/quick-access/components/BrowserList";
import { openUrl } from "@/lib/open-url";
import { useBrowserItems } from "@/widgets/quick-access/hooks/useBrowserItems";
import { keyOf } from "@/widgets/quick-access/lib/url";
import type { QuickAccessTab } from "@/widgets/quick-access/types";
import { useQuickAccess, useQuickAccessStore } from "@/widgets/quick-access/useQuickAccessStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";

function Message({ children }: { children: string }) {
  return (
    <div className="text-muted-foreground/60 flex h-full items-center justify-center text-sm">
      {children}
    </div>
  );
}

type BrowserTabKey = Exclude<QuickAccessTab, "home">;

const TAB_NOUN: Record<BrowserTabKey, string> = {
  bookmarks: "bookmarks",
  recentlyClosed: "recently closed tabs",
  history: "recent sites",
};

const TAB_GATE: Record<
  BrowserTabKey,
  { permission: chrome.runtime.ManifestPermission; message: string }
> = {
  bookmarks: {
    permission: "bookmarks",
    message: "Turn on the Bookmarks permission to browse your bookmarks here.",
  },
  recentlyClosed: {
    permission: "sessions",
    message: "Turn on the Recently closed tabs permission to list them here.",
  },
  history: {
    permission: "history",
    message: "Turn on the Browsing history permission to see recent sites here.",
  },
};

type BrowserTabProps = {
  tab: BrowserTabKey;
  editing: boolean;
};

export function BrowserTab({ tab, editing }: BrowserTabProps) {
  const gate = TAB_GATE[tab];
  const granted = usePermissionGranted(gate.permission);
  const blocked = isPermissionsManageable() && !granted;
  const state = useBrowserItems(tab, !blocked);
  const instanceId = useWidgetInstanceId();
  const openBehavior = useQuickAccess((d) => d.openBehavior);
  const view = useQuickAccess((d) => d.view);
  const links = useQuickAccess((d) => d.links);
  const togglePin = useQuickAccessStore((s) => s.togglePin);
  const pinnedUrls = useMemo(() => new Set(links.map((link) => keyOf(link.url))), [links]);
  const open = (url: string) => openUrl(url, openBehavior);

  if (blocked) {
    return (
      <PermissionPrompt
        permission={gate.permission}
        message={gate.message}
        onOpenSettings={() => useSettingsStore.getState().openPermissions(gate.permission)}
      />
    );
  }

  return (
    <div className="h-full overflow-x-hidden overflow-y-auto">
      {state.status === "loading" && <Message>{`Loading ${TAB_NOUN[tab]}…`}</Message>}
      {state.status === "error" && <Message>{`Couldn’t load ${TAB_NOUN[tab]}`}</Message>}
      {state.status === "ready" &&
        (state.items.length === 0 ? (
          <Message>Nothing here yet</Message>
        ) : (
          <BrowserList
            items={state.items}
            view={view}
            animateLayout={!editing}
            pinnedUrls={pinnedUrls}
            onOpen={open}
            onTogglePin={(item) => togglePin(instanceId, item.title, item.url)}
          />
        ))}
    </div>
  );
}
