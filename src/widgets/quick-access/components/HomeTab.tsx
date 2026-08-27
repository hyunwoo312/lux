import { useMemo, useRef, useState } from "react";
import type { Transition } from "motion/react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { DURATION, EASE_OUT, EASE_STANDARD } from "@/lib/motion";
import { LinkForm } from "@/widgets/quick-access/components/LinkForm";
import { PinnedSection } from "@/widgets/quick-access/components/PinnedSection";
import { useBrowserItems, useOpenTabs } from "@/widgets/quick-access/hooks/useBrowserItems";
import { HomeSection } from "@/widgets/quick-access/components/HomeSection";
import { useSectionGate } from "@/widgets/quick-access/hooks/useSectionGate";
import { useItemActions } from "@/widgets/quick-access/hooks/useItemActions";
import { closeTab, setTabMuted } from "@/widgets/quick-access/browser";
import { keyOf } from "@/widgets/quick-access/lib/url";
import type { LinkResult, QuickLink } from "@/widgets/quick-access/types";
import { useQuickAccess, useQuickAccessStore } from "@/widgets/quick-access/useQuickAccessStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";

type FormState = { mode: "add" } | { mode: "edit"; link: QuickLink };

const MORPH: Transition = { duration: DURATION.slow, ease: EASE_STANDARD };

export function HomeTab({ editing }: { editing: boolean }) {
  const reduced = useReducedMotion() ?? false;
  const morph: Transition = reduced ? { duration: 0 } : MORPH;
  const instanceId = useWidgetInstanceId();
  const view = useQuickAccess((d) => d.view);
  const { open: openItem, pinnedUrls, openBehavior, togglePin: onTogglePin } = useItemActions();
  const showTopSites = useQuickAccess((d) => d.showTopSites);
  const addLink = useQuickAccessStore((s) => s.addLink);
  const editLink = useQuickAccessStore((s) => s.editLink);

  const showOpenTabs = useQuickAccess((d) => d.showOpenTabs);
  const showRecentlyClosed = useQuickAccess((d) => d.showRecentlyClosed);
  const topSitesGate = useSectionGate("topSites", showTopSites);
  const openTabsGate = useSectionGate("openTabs", showOpenTabs);
  const recentGate = useSectionGate("recentlyClosed", showRecentlyClosed);
  const topSitesState = useBrowserItems("topSites", topSitesGate.ready);
  const openTabsState = useOpenTabs(openTabsGate.ready);
  const recentState = useBrowserItems("recentlyClosed", recentGate.ready);
  const [form, setForm] = useState<FormState | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const topSites = useMemo(() => {
    if (topSitesState.status !== "ready") return topSitesState;
    return {
      ...topSitesState,
      items: topSitesState.items.filter((item) => !pinnedUrls.has(keyOf(item.url))),
    };
  }, [topSitesState, pinnedUrls]);

  const submit = (title: string, url: string): LinkResult => {
    const result =
      form?.mode === "edit"
        ? editLink(instanceId, form.link.id, title, url)
        : addLink(instanceId, title, url);
    if (result === "ok") setForm(null);
    return result;
  };

  return (
    <div className="relative h-full overflow-hidden">
      <motion.div
        ref={scrollRef}
        animate={{ x: form ? "-12%" : 0, opacity: form ? 0 : 1 }}
        transition={{ duration: reduced ? 0 : DURATION.base, ease: EASE_OUT }}
        className={cn(
          "h-full overflow-x-hidden scroll-fade overflow-y-auto",
          form && "pointer-events-none",
        )}
      >
        <PinnedSection
          editing={editing}
          formOpen={Boolean(form)}
          morph={morph}
          onAdd={() => setForm({ mode: "add" })}
          onEdit={(link) => setForm({ mode: "edit", link })}
        />

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
      </motion.div>

      {form && (
        <motion.div
          layoutId="qa-add"
          transition={morph}
          className="
            bg-popover border-border/60 absolute inset-x-2 top-1/2 z-10 -translate-y-1/2 rounded-lg
            border p-3 shadow-lg
          "
        >
          <LinkForm
            initial={form.mode === "edit" ? form.link : undefined}
            pinnedUrls={pinnedUrls}
            onSubmit={submit}
            onCancel={() => setForm(null)}
          />
        </motion.div>
      )}
    </div>
  );
}
