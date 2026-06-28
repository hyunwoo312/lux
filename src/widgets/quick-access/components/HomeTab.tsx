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
import { PermissionPrompt } from "@/components/PermissionPrompt";
import { usePermissionGranted } from "@/hooks/usePermission";
import { isPermissionsManageable } from "@/lib/permissions";
import { useSettingsStore } from "@/settings";
import { cn } from "@/lib/utils";
import { GRID_MODIFIERS, VERTICAL_LIST_MODIFIERS } from "@/lib/dnd";
import { openUrl } from "@/lib/open-url";
import { EASE_IN_OUT } from "@/lib/motion";
import { BrowserList } from "@/widgets/quick-access/components/BrowserList";
import { LinkForm } from "@/widgets/quick-access/components/LinkForm";
import { SortablePin } from "@/widgets/quick-access/components/SortablePin";
import { useBrowserItems } from "@/widgets/quick-access/hooks/useBrowserItems";
import {
  QA_GRID_CONTAINER,
  QA_LIST_CONTAINER,
  qaItemGeometry,
} from "@/widgets/quick-access/lib/itemStyles";
import { keyOf } from "@/widgets/quick-access/lib/url";
import type { BrowserItem, QuickLink } from "@/widgets/quick-access/types";
import { useQuickAccessStore } from "@/widgets/quick-access/useQuickAccessStore";

type FormState = { mode: "add" } | { mode: "edit"; link: QuickLink };

const MORPH: Transition = { duration: 0.32, ease: EASE_IN_OUT };

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

  const topSitesGranted = usePermissionGranted("topSites");
  const topSitesBlocked = showTopSites && isPermissionsManageable() && !topSitesGranted;
  const topSitesState = useBrowserItems("topSites", showTopSites && !topSitesBlocked);
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
  const listClass = isGrid ? QA_GRID_CONTAINER : QA_LIST_CONTAINER;

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
              {(hasTopSites || topSitesBlocked) && <SectionHeader>Pinned</SectionHeader>}
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

        {topSitesBlocked && (
          <section className="mt-3 flex flex-col gap-1.5">
            <SectionHeader>Top sites</SectionHeader>
            <PermissionPrompt
              permission="topSites"
              variant="inline"
              message="Turn on the Top sites permission to show your most-visited sites."
              onOpenSettings={() => useSettingsStore.getState().openPermissions("topSites")}
            />
          </section>
        )}

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
            bg-popover border-border/60 absolute inset-x-2 top-1/2 z-10 -translate-y-1/2 rounded-xl
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
