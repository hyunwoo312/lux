import { useId, useLayoutEffect, useRef } from "react";
import { matchesQuery } from "@/lib/utils";
import type { DragEndEvent } from "@dnd-kit/core";
import { closestCenter, DndContext } from "@dnd-kit/core";
import {
  rectSortingStrategy,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { Transition } from "motion/react";
import { motion } from "motion/react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { GRID_MODIFIERS, moveById, useSortableSensors, VERTICAL_LIST_MODIFIERS } from "@/lib/dnd";
import { SectionHeader } from "@/widgets/quick-access/components/HomeSection";
import { SortablePin } from "@/widgets/quick-access/components/SortablePin";
import {
  QA_GRID_CONTAINER,
  QA_LIST_CONTAINER,
  qaItemGeometry,
} from "@/widgets/quick-access/lib/itemStyles";
import type { QuickLink } from "@/widgets/quick-access/types";
import { useQuickAccess, useQuickAccessStore } from "@/widgets/quick-access/useQuickAccessStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import { DashedAction } from "@/components/DashedAction";

type PinnedSectionProps = {
  editing: boolean;
  formOpen: boolean;
  filter: string;
  layoutId: string;
  morph: Transition;
  onAdd: () => void;
  onEdit: (link: QuickLink) => void;
};

export function PinnedSection({
  editing,
  formOpen,
  morph,
  onAdd,
  onEdit,
  filter,
  layoutId,
}: PinnedSectionProps) {
  const instanceId = useWidgetInstanceId();
  const links = useQuickAccess((d) => d.links);
  const view = useQuickAccess((d) => d.view);
  const openBehavior = useQuickAccess((d) => d.openBehavior);
  const setLinks = useQuickAccessStore((s) => s.setLinks);
  const removeLink = useQuickAccessStore((s) => s.removeLink);

  const list = useRef<HTMLUListElement>(null);
  const returnFocus = useRef<string | null>(null);
  const needsFocus = useRef(false);
  const instructionId = useId();
  const trimmed = filter.trim();
  const visible = trimmed
    ? links.filter((link) => matchesQuery(link.title, trimmed) || matchesQuery(link.url, trimmed))
    : links;
  useLayoutEffect(() => {
    if (!needsFocus.current) return;
    needsFocus.current = false;
    const anchors = [...(list.current?.querySelectorAll<HTMLElement>("[data-pin-id]") ?? [])];
    (
      anchors.find((anchor) => anchor.dataset.pinId === returnFocus.current) ??
      anchors[0] ??
      list.current?.querySelector<HTMLElement>('[aria-label="Add link"]')
    )?.focus({ preventScroll: true });
  }, [links]);
  const remove = (link: QuickLink) => {
    const index = visible.findIndex((entry) => entry.id === link.id);
    returnFocus.current = visible[index + 1]?.id ?? visible[index - 1]?.id ?? null;
    needsFocus.current = true;
    removeLink(instanceId, link.id);
  };
  const sensors = useSortableSensors();
  const isGrid = view === "grid";

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over) return;
    const reordered = moveById(links, String(active.id), String(over.id), (link) => link.id);
    if (reordered) setLinks(instanceId, reordered);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={isGrid ? GRID_MODIFIERS : VERTICAL_LIST_MODIFIERS}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={visible.map((link) => link.id)}
        strategy={isGrid ? rectSortingStrategy : verticalListSortingStrategy}
      >
        <div className="flex flex-col gap-1.5">
          <SectionHeader>
            Pinned{" "}
            <span className="text-ink-3 text-micro font-normal tabular-nums">
              {visible.length}
              {filter.trim() ? ` / ${links.length}` : ""}
            </span>
          </SectionHeader>
          <p id={instructionId} className="sr-only">
            Use Space to reorder a pin with arrow keys, then Space to place it. Use its actions
            button to edit or remove it.
          </p>
          {filter.trim() && visible.length === 0 && (
            <p role="status" className="text-ink-3 px-2 text-caption">
              No pinned links match “{filter.trim()}”.
            </p>
          )}
          <ul
            ref={list}
            aria-describedby={instructionId}
            className={isGrid ? QA_GRID_CONTAINER : QA_LIST_CONTAINER}
          >
            {visible.map((link) => (
              <SortablePin
                key={link.id}
                link={link}
                view={view}
                openBehavior={openBehavior}
                onEdit={() => onEdit(link)}
                onRemove={() => remove(link)}
              />
            ))}
            {!formOpen && (
              <motion.li
                layoutId={editing ? undefined : layoutId}
                transition={morph}
                className="list-none"
              >
                <DashedAction
                  onClick={onAdd}
                  aria-label="Add link"
                  className={cn(qaItemGeometry(view), !isGrid && "[&_svg]:size-4")}
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
                </DashedAction>
              </motion.li>
            )}
          </ul>
        </div>
      </SortableContext>
    </DndContext>
  );
}
