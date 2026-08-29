import type { DragEndEvent } from "@dnd-kit/core";
import { closestCenter, DndContext } from "@dnd-kit/core";
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
import { GRID_MODIFIERS, useSortableSensors, VERTICAL_LIST_MODIFIERS } from "@/lib/dnd";
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

type PinnedSectionProps = {
  editing: boolean;
  formOpen: boolean;
  morph: Transition;
  onAdd: () => void;
  onEdit: (link: QuickLink) => void;
};

export function PinnedSection({ editing, formOpen, morph, onAdd, onEdit }: PinnedSectionProps) {
  const instanceId = useWidgetInstanceId();
  const links = useQuickAccess((d) => d.links);
  const view = useQuickAccess((d) => d.view);
  const openBehavior = useQuickAccess((d) => d.openBehavior);
  const setLinks = useQuickAccessStore((s) => s.setLinks);
  const removeLink = useQuickAccessStore((s) => s.removeLink);

  const sensors = useSortableSensors();
  const isGrid = view === "grid";

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = links.findIndex((link) => link.id === active.id);
    const newIndex = links.findIndex((link) => link.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    setLinks(instanceId, arrayMove(links, oldIndex, newIndex));
  };

  return (
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
          <ul className={isGrid ? QA_GRID_CONTAINER : QA_LIST_CONTAINER}>
            {links.map((link) => (
              <SortablePin
                key={link.id}
                link={link}
                view={view}
                openBehavior={openBehavior}
                onEdit={() => onEdit(link)}
                onRemove={() => removeLink(instanceId, link.id)}
              />
            ))}
            {!formOpen && (
              <motion.li
                layoutId={editing ? undefined : "qa-add"}
                transition={morph}
                className="list-none"
              >
                <button
                  type="button"
                  onClick={onAdd}
                  aria-label="Add link"
                  className={cn(
                    "press-row focus-ring transition-colors",
                    `
                      text-ink-3
                      hover:text-ink hover:border-foreground/40
                      border-border/60 w-full cursor-pointer border border-dashed transition-colors
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
  );
}
