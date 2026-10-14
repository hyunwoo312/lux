import { useMemo, type RefObject } from "react";
import { HomeSection } from "@/widgets/quick-access/components/HomeSection";
import { useBrowserItems, useOpenTabs } from "@/widgets/quick-access/hooks/useBrowserItems";
import { useSectionGate } from "@/widgets/quick-access/hooks/useSectionGate";
import { useItemActions } from "@/widgets/quick-access/hooks/useItemActions";
import { closeTab, setTabMuted } from "@/lib/browser";
import { keyOf } from "@/widgets/quick-access/lib/url";
import { useQuickAccess } from "@/widgets/quick-access/useQuickAccessStore";

type Props = { editing: boolean; active: boolean; scrollRef: RefObject<HTMLDivElement | null> };
export function HomeBrowserSections({ editing, active, scrollRef }: Props) {
  const view = useQuickAccess((d) => d.view);
  const { open: openItem, pinnedUrls, openBehavior, togglePin: onTogglePin } = useItemActions();
  const showTopSites = useQuickAccess((d) => d.showTopSites);

  const showOpenTabs = useQuickAccess((d) => d.showOpenTabs);
  const showRecentlyClosed = useQuickAccess((d) => d.showRecentlyClosed);
  const topSitesGate = useSectionGate("topSites", showTopSites);
  const openTabsGate = useSectionGate("openTabs", showOpenTabs);
  const recentGate = useSectionGate("recentlyClosed", showRecentlyClosed);
  const topSitesState = useBrowserItems("topSites", topSitesGate.ready && active);
  const openTabsState = useOpenTabs(openTabsGate.ready && active);
  const recentState = useBrowserItems("recentlyClosed", recentGate.ready && active);
  const topSites = useMemo(() => {
    if (topSitesState.status !== "ready") return topSitesState;
    return {
      ...topSitesState,
      items: topSitesState.items.filter((item) => !pinnedUrls.has(keyOf(item.url))),
    };
  }, [topSitesState, pinnedUrls]);

  return (
    <>
      <HomeSection
        source="topSites"
        title="Top sites"
        state={topSites}
        view={view}
        openBehavior={openBehavior}
        animateLayout={!editing}
        pinnedUrls={pinnedUrls}
        scrollRef={scrollRef}
        blocked={topSitesGate.blocked}
        onOpen={openItem}
        onTogglePin={onTogglePin}
      />

      <HomeSection
        source="openTabs"
        title="Open tabs"
        state={openTabsState}
        view={view}
        openBehavior={openBehavior}
        animateLayout={!editing}
        pinnedUrls={pinnedUrls}
        scrollRef={scrollRef}
        blocked={openTabsGate.blocked}
        onOpen={openItem}
        onTogglePin={onTogglePin}
        onCloseTab={(item) => item.tabId !== undefined && void closeTab(item.tabId)}
        onToggleMuted={(item) =>
          item.tabId !== undefined && void setTabMuted(item.tabId, item.muted !== true)
        }
      />

      <HomeSection
        source="recentlyClosed"
        title="Recently closed"
        state={recentState}
        view={view}
        openBehavior={openBehavior}
        animateLayout={!editing}
        pinnedUrls={pinnedUrls}
        scrollRef={scrollRef}
        blocked={recentGate.blocked}
        onOpen={openItem}
        onTogglePin={onTogglePin}
      />
    </>
  );
}
