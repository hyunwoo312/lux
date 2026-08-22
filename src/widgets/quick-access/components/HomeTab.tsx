import { useMemo, useRef, useState } from "react";
import type { DragEndEvent } from "@dnd-kit/core";
import { closestCenter, DndContext, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { Transition } from "motion/react";
import { motion } from "motion/react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { GRID_MODIFIERS, VERTICAL_LIST_MODIFIERS } from "@/lib/dnd";
import { DURATION, EASE_OUT, EASE_STANDARD } from "@/lib/motion";
import { LinkForm } from "@/widgets/quick-access/components/LinkForm";
import { SortablePin } from "@/widgets/quick-access/components/SortablePin";
import { useBrowserItems, useOpenTabs } from "@/widgets/quick-access/hooks/useBrowserItems";
import { HomeSection, SectionHeader } from "@/widgets/quick-access/components/HomeSection";
import { useSectionGate } from "@/widgets/quick-access/hooks/useSectionGate";
import { useItemActions } from "@/widgets/quick-access/hooks/useItemActions";
import {
  QA_GRID_CONTAINER,
  QA_LIST_CONTAINER,
  qaItemGeometry,
} from "@/widgets/quick-access/lib/itemStyles";
import { closeTab, setTabMuted } from "@/widgets/quick-access/browser";
import { keyOf } from "@/widgets/quick-access/lib/url";
import type { BrowserItem, LinkResult, QuickLink } from "@/widgets/quick-access/types";
import { useQuickAccess, useQuickAccessStore } from "@/widgets/quick-access/useQuickAccessStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";

type FormState = { mode: "add" } | { mode: "edit"; link: QuickLink };

const MORPH: Transition = { duration: DURATION.slow, ease: EASE_STANDARD };

export function HomeTab({ editing }: { editing: boolean }) {
  const instanceId = useWidgetInstanceId();
  const links = useQuickAccess((d) => d.links);
  const view = useQuickAccess((d) => d.view);
  const openBehavior = useQuickAccess((d) => d.openBehavior);
  const { open: openItem } = useItemActions();
  const showTopSites = useQuickAccess((d) => d.showTopSites);
  const addLink = useQuickAccessStore((s) => s.addLink);
  const editLink = useQuickAccessStore((s) => s.editLink);
  const removeLink = useQuickAccessStore((s) => s.removeLink);
  const setLinks = useQuickAccessStore((s) => s.setLinks);
  const togglePin = useQuickAccessStore((s) => s.togglePin);

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

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const pinnedKeys = useMemo(() => new Set(links.map((link) => keyOf(link.url))), [links]);
  const topSites = useMemo(() => {
    if (topSitesState.status !== "ready") return [];
    return topSitesState.items.filter((item) => !pinnedKeys.has(keyOf(item.url)));
  }, [topSitesState, pinnedKeys]);

  const openTabs = openTabsState.status === "ready" ? openTabsState.items : [];
  const recentlyClosed = recentState.status === "ready" ? recentState.items : [];
  const isGrid = view === "grid";
  const listClass = isGrid ? QA_GRID_CONTAINER : QA_LIST_CONTAINER;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = links.findIndex((link) => link.id === active.id);
    const newIndex = links.findIndex((link) => link.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    setLinks(instanceId, arrayMove(links, oldIndex, newIndex));
  };

  const submit = (title: string, url: string, icon: string): LinkResult => {
    const result =
      form?.mode === "edit"
        ? editLink(instanceId, form.link.id, title, url, icon)
        : addLink(instanceId, title, url, icon);
    if (result === "ok") setForm(null);
    return result;
  };

  const onTogglePin = (item: BrowserItem) => togglePin(instanceId, item.title, item.url);

  return (
    <div className="relative h-full overflow-hidden">
      <motion.div
        ref={scrollRef}
        animate={{ x: form ? "-12%" : 0, opacity: form ? 0 : 1 }}
        transition={{ duration: DURATION.base, ease: EASE_OUT }}
        className={cn(
          "h-full overflow-x-hidden scroll-fade overflow-y-auto",
          form && "pointer-events-none",
        )}
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={isGrid ? GRID_MODIFIERS : VERTICAL_LIST_MODIFIERS}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={links.map((link) => link.id)}
            strategy={isGrid ? rectSortingStrategy : verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-1.5">
              <SectionHeader>Pinned</SectionHeader>
              <ul className={listClass}>
                {links.map((link) => (
                  <SortablePin
                    key={link.id}
                    link={link}
                    view={view}
                    openBehavior={openBehavior}
                    onEdit={() => setForm({ mode: "edit", link })}
                    onRemove={() => removeLink(instanceId, link.id)}
                  />
                ))}
                {!form && (
                  <motion.li
                    layoutId={editing ? undefined : "qa-add"}
                    transition={MORPH}
                    className="list-none"
                  >
                    <button
                      type="button"
                      onClick={() => setForm({ mode: "add" })}
                      aria-label="Add link"
                      className={cn(
                        "press-row transition-colors",
                        `
                          text-ink-4
                          hover:text-ink hover:border-foreground/40
                          border-border/60 w-full cursor-pointer border border-dashed
                          transition-colors
                        `,
                        qaItemGeometry(view),
                        !isGrid && "[&_svg]:size-4",
                      )}
                    >
                      {isGrid ? (
                        <>
                          <span className="grid size-8 place-items-center [&_svg]:size-5">
                            <Plus />
                          </span>
                          <span className="w-full truncate text-center text-caption">Add</span>
                        </>
                      ) : (
                        <>
                          <Plus />
                          <span className="text-body">Add link</span>
                        </>
                      )}
                    </button>
                  </motion.li>
                )}
              </ul>
            </div>
          </SortableContext>
        </DndContext>

        <HomeSection
          source="topSites"
          title="Top sites"
          items={topSites}
          view={view}
          openBehavior={openBehavior}
          animateLayout={!editing}
          pinnedUrls={pinnedKeys}
          scrollRef={scrollRef}
          blocked={topSitesGate.blocked}
          onOpen={openItem}
          onTogglePin={onTogglePin}
        />

        <HomeSection
          source="openTabs"
          title="Open tabs"
          items={openTabs}
          view={view}
          openBehavior={openBehavior}
          animateLayout={!editing}
          pinnedUrls={pinnedKeys}
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
          items={recentlyClosed}
          view={view}
          openBehavior={openBehavior}
          animateLayout={!editing}
          pinnedUrls={pinnedKeys}
          scrollRef={scrollRef}
          blocked={recentGate.blocked}
          onOpen={openItem}
          onTogglePin={onTogglePin}
        />
      </motion.div>

      {form && (
        <motion.div
          layoutId="qa-add"
          transition={MORPH}
          className="
            bg-popover border-border/60 absolute inset-x-2 top-1/2 z-10 -translate-y-1/2 rounded-lg
            border p-3 shadow-lg
          "
        >
          <LinkForm
            initial={form.mode === "edit" ? form.link : undefined}
            pinnedUrls={pinnedKeys}
            onSubmit={submit}
            onCancel={() => setForm(null)}
          />
        </motion.div>
      )}
    </div>
  );
}
