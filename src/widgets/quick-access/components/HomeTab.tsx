import { useMemo, useState } from "react";
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
import { openUrl } from "@/widgets/quick-access/browser";
import { BrowserList } from "@/widgets/quick-access/components/BrowserList";
import { LinkForm } from "@/widgets/quick-access/components/LinkForm";
import { SortablePin } from "@/widgets/quick-access/components/SortablePin";
import { useBrowserItems } from "@/widgets/quick-access/hooks/useBrowserItems";
import { normalizeUrl } from "@/widgets/quick-access/lib/url";
import type { BrowserItem, QuickLink } from "@/widgets/quick-access/types";
import { useQuickAccessStore } from "@/widgets/quick-access/useQuickAccessStore";

type FormState = { mode: "add" } | { mode: "edit"; link: QuickLink };

const MORPH: Transition = { duration: 0.32, ease: [0.4, 0, 0.2, 1] };

const keyOf = (url: string) => normalizeUrl(url) ?? url;

function SectionHeader({ children }: { children: string }) {
  return (
    <span className="text-muted-foreground/70 text-2xs px-1 font-semibold tracking-wider uppercase">
      {children}
    </span>
  );
}

export function HomeTab({ editing }: { editing: boolean }) {
  const links = useQuickAccessStore((s) => s.links);
  const view = useQuickAccessStore((s) => s.view);
  const openBehavior = useQuickAccessStore((s) => s.openBehavior);
  const showTopSites = useQuickAccessStore((s) => s.showTopSites);
  const addLink = useQuickAccessStore((s) => s.addLink);
  const editLink = useQuickAccessStore((s) => s.editLink);
  const removeLink = useQuickAccessStore((s) => s.removeLink);
  const setLinks = useQuickAccessStore((s) => s.setLinks);
  const togglePin = useQuickAccessStore((s) => s.togglePin);

  const topSitesState = useBrowserItems("topSites", showTopSites);
  const [form, setForm] = useState<FormState | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const open = (url: string) => openUrl(url, openBehavior);

  const pinnedKeys = useMemo(() => new Set(links.map((link) => keyOf(link.url))), [links]);
  const topSites = useMemo(() => {
    if (topSitesState.status !== "ready") return [];
    return topSitesState.items.filter((item) => !pinnedKeys.has(keyOf(item.url)));
  }, [topSitesState, pinnedKeys]);

  const hasTopSites = showTopSites && topSites.length > 0;
  const isGrid = view === "grid";
  const listClass = isGrid
    ? "grid grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] gap-1"
    : "flex flex-col gap-0.5";

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = links.findIndex((link) => link.id === active.id);
    const newIndex = links.findIndex((link) => link.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    setLinks(arrayMove(links, oldIndex, newIndex));
  };

  const submit = (title: string, url: string) => {
    if (form?.mode === "edit") editLink(form.link.id, title, url);
    else addLink(title, url);
    setForm(null);
  };

  const onTogglePin = (item: BrowserItem) => togglePin(item.title, item.url);

  return (
    <div className="relative h-full overflow-hidden">
      <motion.div
        animate={{ x: form ? "-12%" : 0, opacity: form ? 0 : 1 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className={cn("h-full overflow-x-hidden overflow-y-auto", form && "pointer-events-none")}
      >
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={links.map((link) => link.id)}
            strategy={isGrid ? rectSortingStrategy : verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-1.5">
              {hasTopSites && <SectionHeader>Pinned</SectionHeader>}
              <ul className={listClass}>
                {links.map((link) => (
                  <SortablePin
                    key={link.id}
                    link={link}
                    view={view}
                    onOpen={open}
                    onEdit={() => setForm({ mode: "edit", link })}
                    onRemove={() => removeLink(link.id)}
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
                        `
                          text-muted-foreground/60
                          hover:text-foreground hover:border-foreground/40
                          border-border/60 flex w-full cursor-pointer items-center border
                          border-dashed transition-colors
                        `,
                        isGrid
                          ? "flex-col gap-1.5 rounded-lg p-2"
                          : "gap-2.5 rounded-md px-2 py-1.5 [&_svg]:size-4",
                      )}
                    >
                      {isGrid ? (
                        <>
                          <span className="grid size-8 place-items-center [&_svg]:size-5">
                            <Plus />
                          </span>
                          <span className="w-full truncate text-center text-xs">Add</span>
                        </>
                      ) : (
                        <>
                          <Plus />
                          <span className="text-sm">Add link</span>
                        </>
                      )}
                    </button>
                  </motion.li>
                )}
              </ul>
            </div>
          </SortableContext>
        </DndContext>

        {hasTopSites && (
          <section className="mt-3 flex flex-col gap-1.5">
            <SectionHeader>Top sites</SectionHeader>
            <BrowserList
              items={topSites}
              view={view}
              animateLayout={!editing}
              pinnedUrls={pinnedKeys}
              onOpen={open}
              onTogglePin={onTogglePin}
            />
          </section>
        )}
      </motion.div>

      {form && (
        <motion.div
          layoutId="qa-add"
          transition={MORPH}
          className="
            glass absolute inset-x-2 top-1/2 z-10 -translate-y-1/2 rounded-xl p-3 shadow-lg
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
