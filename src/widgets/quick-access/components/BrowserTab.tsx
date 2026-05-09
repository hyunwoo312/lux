import { useMemo } from "react";
import { BrowserList } from "@/widgets/quick-access/components/BrowserList";
import { openUrl } from "@/widgets/quick-access/browser";
import { useBrowserItems } from "@/widgets/quick-access/hooks/useBrowserItems";
import type { QuickAccessTab } from "@/widgets/quick-access/types";
import { useQuickAccessStore } from "@/widgets/quick-access/useQuickAccessStore";

function Message({ children }: { children: string }) {
  return (
    <div className="text-muted-foreground/60 flex h-full items-center justify-center text-sm">
      {children}
    </div>
  );
}

type BrowserTabProps = {
  tab: Exclude<QuickAccessTab, "home">;
  editing: boolean;
};

export function BrowserTab({ tab, editing }: BrowserTabProps) {
  const state = useBrowserItems(tab);
  const openBehavior = useQuickAccessStore((s) => s.openBehavior);
  const view = useQuickAccessStore((s) => s.view);
  const links = useQuickAccessStore((s) => s.links);
  const togglePin = useQuickAccessStore((s) => s.togglePin);
  const pinnedUrls = useMemo(() => new Set(links.map((link) => link.url)), [links]);
  const open = (url: string) => openUrl(url, openBehavior);

  return (
    <div className="h-full overflow-x-hidden overflow-y-auto">
      {state.status === "loading" && <Message>Loading…</Message>}
      {state.status === "error" && <Message>Couldn’t load</Message>}
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
            onTogglePin={(item) => togglePin(item.title, item.url)}
          />
        ))}
    </div>
  );
}
