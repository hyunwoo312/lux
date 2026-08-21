import { useRef } from "react";
import { PermissionPrompt } from "@/components/PermissionPrompt";
import { useGrantedPermissions } from "@/hooks/usePermission";
import { isPermissionsManageable } from "@/lib/permissions";
import { useSettingsStore } from "@/settings";
import { BrowserMessage } from "@/widgets/quick-access/components/BrowserMessage";
import { BookmarksView } from "@/widgets/quick-access/components/BookmarksView";
import { BrowserList } from "@/widgets/quick-access/components/BrowserList";
import { useBrowserItems } from "@/widgets/quick-access/hooks/useBrowserItems";
import { useItemActions } from "@/widgets/quick-access/hooks/useItemActions";
import type { ItemSource, QuickAccessTab } from "@/widgets/quick-access/types";
import { useQuickAccess } from "@/widgets/quick-access/useQuickAccessStore";

type BrowserTabKey = Exclude<QuickAccessTab, "home">;

const TAB_NOUN: Record<Exclude<BrowserTabKey, "bookmarks">, string> = {
  recentlyClosed: "recently closed tabs",
  history: "recent sites",
};

const TAB_GATE: Record<
  BrowserTabKey,
  {
    permissions: chrome.runtime.ManifestPermission[];
    highlight: chrome.runtime.ManifestPermission;
    message: string;
    partlyGrantedMessage?: string;
  }
> = {
  bookmarks: {
    permissions: ["bookmarks"],
    highlight: "bookmarks",
    message: "Turn on the Bookmarks permission to browse your bookmarks here.",
  },
  recentlyClosed: {
    permissions: ["sessions", "tabs"],
    highlight: "sessions",
    message:
      "Turn on the Recently closed tabs permission to list them here. Enabling it reloads this tab.",
    partlyGrantedMessage:
      "Chrome only reveals closed tabs’ titles to extensions that can read tab details. Enable that to list them here — it reloads this tab.",
  },
  history: {
    permissions: ["history"],
    highlight: "history",
    message: "Turn on the Browsing history permission to see recent sites here.",
  },
};

type BrowserTabProps = {
  tab: BrowserTabKey;
  editing: boolean;
};

export function BrowserTab({ tab, editing }: BrowserTabProps) {
  const gate = TAB_GATE[tab];
  const granted = useGrantedPermissions();
  const missing = gate.permissions.filter((permission) => !granted.has(permission));

  if (isPermissionsManageable() && missing.length > 0) {
    const partlyGranted = missing.length < gate.permissions.length;
    return (
      <PermissionPrompt
        permissions={gate.permissions}
        message={
          partlyGranted && gate.partlyGrantedMessage ? gate.partlyGrantedMessage : gate.message
        }
        onOpenSettings={() => useSettingsStore.getState().openPermissions(gate.highlight)}
      />
    );
  }

  if (tab === "bookmarks") return <BookmarksView editing={editing} />;
  return <ItemsView tab={tab} editing={editing} />;
}

function ItemsView({ tab, editing }: { tab: ItemSource & BrowserTabKey; editing: boolean }) {
  const state = useBrowserItems(tab);
  const view = useQuickAccess((d) => d.view);
  const { pinnedUrls, open, togglePin } = useItemActions();
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={scrollRef} className="h-full overflow-x-hidden scroll-fade overflow-y-auto">
      {state.status === "loading" && <BrowserMessage>{`Loading ${TAB_NOUN[tab]}…`}</BrowserMessage>}
      {state.status === "error" && (
        <BrowserMessage>{`Couldn’t load ${TAB_NOUN[tab]}`}</BrowserMessage>
      )}
      {state.status === "ready" &&
        (state.items.length === 0 ? (
          <BrowserMessage>{`No ${TAB_NOUN[tab]} yet`}</BrowserMessage>
        ) : (
          <BrowserList
            items={state.items}
            view={view}
            animateLayout={!editing}
            pinnedUrls={pinnedUrls}
            scrollRef={scrollRef}
            onOpen={open}
            onTogglePin={togglePin}
          />
        ))}
    </div>
  );
}
