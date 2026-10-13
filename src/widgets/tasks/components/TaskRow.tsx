import { Sun, X, ListChecks, AlignLeft, GripVertical } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { ItemActionButton } from "@/components/ItemActionButton";
import { Tooltip } from "@/components/ui/tooltip";
import { useIsOverflowing } from "@/hooks/useIsOverflowing";
import type { RovingItemProps } from "@/hooks/useRovingFocus";
import { ROW } from "@/lib/row";
import { cn } from "@/lib/utils";
import { SortableRow } from "@/widgets/core/SortableRow";
import { taskActionFor, TASK_SHORTCUTS, type TaskAction } from "@/widgets/tasks/lib/shortcuts";
import type { Task } from "@/widgets/tasks/types";

export function TaskRow({
  task,
  day,
  sortable,
  onToggle,
  onOpen,
  onAction,
  navigation,
}: {
  task: Task;
  day: string;
  sortable: boolean;
  onToggle: () => void;
  onOpen: () => void;
  onAction: (action: TaskAction) => void;
  navigation: RovingItemProps;
}) {
  const [measureRef, truncated] = useIsOverflowing<HTMLSpanElement>("horizontal", task.title);
  const children = task.subtasks ?? [];
  const progress = children.length
    ? children.filter((child) => child.done).length + "/" + children.length
    : null;
  const help = Object.values(TASK_SHORTCUTS)
    .map((shortcut) => shortcut.hint)
    .join(" · ");
  return (
    <SortableRow
      id={task.id}
      disabled={!sortable}
      tabIndex={sortable ? 0 : -1}
      label={sortable ? "Reorder " + task.title : undefined}
      className={cn(ROW.item, "group relative")}
    >
      {task.important && (
        <span aria-hidden className="bg-primary absolute inset-y-2 left-0 w-0.5 rounded-full" />
      )}
      {sortable && <GripVertical aria-hidden className="text-ink-3 size-3 shrink-0" />}
      <Checkbox
        checked={task.done}
        aria-label={"Mark " + task.title + " as " + (task.done ? "not done" : "done")}
        onCheckedChange={onToggle}
        onPointerDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      />
      <Tooltip
        content={truncated ? task.title : "Task details · " + help}
        side="top"
        align="start"
        prose
      >
        <button
          type="button"
          {...navigation}
          aria-label={"Edit " + task.title}
          data-task-id={task.id}
          onClick={onOpen}
          onPointerDown={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            const action = taskActionFor(event);
            if (action) {
              event.preventDefault();
              event.stopPropagation();
              onAction(action);
            } else if (event.key === " " || event.key === "Enter") event.stopPropagation();
          }}
          className={cn(
            `
              focus-ring flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 rounded-sm
              text-left text-body
            `,
            task.done && "text-ink-3 line-through",
          )}
        >
          <span ref={measureRef} className="min-w-0 flex-1 truncate">
            {task.title}
          </span>
          <span className="text-ink-3 flex shrink-0 items-center gap-1 text-micro tabular-nums">
            {task.important && <span className="sr-only">Important</span>}
            {task.todayKey === day && (
              <>
                <Sun aria-hidden className="size-3" />
                <span className="sr-only">Today</span>
              </>
            )}
            {task.description && (
              <>
                <AlignLeft aria-hidden className="size-3" />
                <span className="sr-only">Has description</span>
              </>
            )}
            {progress && (
              <>
                <ListChecks aria-hidden className="size-3" />
                <span aria-label={progress + " checklist steps complete"}>{progress}</span>
              </>
            )}
          </span>
        </button>
      </Tooltip>
      <div className={cn(ROW.reveal, "flex shrink-0 items-center gap-0.5")}>
        <ItemActionButton
          label={"Delete " + task.title}
          onClick={() => onAction("remove")}
          className="hover:text-destructive"
        >
          <X aria-hidden />
        </ItemActionButton>
      </div>
    </SortableRow>
  );
}
