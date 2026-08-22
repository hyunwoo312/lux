import { useRef, useState } from "react";
import { PermissionPrompt } from "@/components/PermissionPrompt";
import { useGrantedPermissions } from "@/hooks/usePermission";
import { isPermissionsManageable } from "@/lib/permissions";
import { useSettingsStore } from "@/settings";
import { BrowserMessage } from "@/widgets/quick-access/components/BrowserMessage";
import { BookmarksView } from "@/widgets/quick-access/components/BookmarksView";
import { BrowserList } from "@/widgets/quick-access/components/BrowserList";
import { useBrowserItems } from "@/widgets/quick-access/hooks/useBrowserItems";
import { useItemActions } from "@/widgets/quick-access/hooks/useItemActions";
import { useHistorySearch } from "@/widgets/quick-access/hooks/useHistorySearch";
import { QuickSearch } from "@/widgets/quick-access/components/QuickSearch";
import { filterItems } from "@/widgets/quick-access/lib/search";
import type { ItemSource, QuickAccessTab } from "@/widgets/quick-access/types";
import { useQuickAccess } from "@/widgets/quick-access/useQuickAccessStore";

type BrowserTabKey = Exclude<QuickAccessTab, "home">;

const TAB_NOUN: Record<Exclude<BrowserTabKey, "bookmarks">, string> = {
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
  const { pinnedUrls, openBehavior, open, togglePin } = useItemActions();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const searched = useHistorySearch(tab === "history" ? query : "");

  const items =
    state.status === "ready"
      ? tab === "history" && query.trim()
        ? (searched ?? [])
        : filterItems(state.items, query)
      : [];
  const searching = tab === "history" && Boolean(query.trim()) && searched === null;

  return (
    <div className="flex h-full flex-col">
      <QuickSearch value={query} onChange={setQuery} label={`Search ${TAB_NOUN[tab]}`} />
      <div ref={scrollRef} className="scroll-fade min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
        {state.status === "loading" && (
          <BrowserMessage>{`Loading ${TAB_NOUN[tab]}…`}</BrowserMessage>
        )}
        {state.status === "error" && (
          <BrowserMessage>{`Couldn’t load ${TAB_NOUN[tab]}`}</BrowserMessage>
        )}
        {state.status === "ready" &&
          (searching ? (
            <BrowserMessage>Searching…</BrowserMessage>
          ) : items.length === 0 ? (
            <BrowserMessage>
              {query.trim() ? `No matches for “${query.trim()}”` : `No ${TAB_NOUN[tab]} yet`}
            </BrowserMessage>
          ) : (
            <BrowserList
              items={items}
              view={view}
              animateLayout={!editing}
              pinnedUrls={pinnedUrls}
              scrollRef={scrollRef}
              openBehavior={openBehavior}
              onOpen={open}
              onTogglePin={togglePin}
            />
          ))}
      </div>
    </div>
  );
}
