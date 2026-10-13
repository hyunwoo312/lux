import { useRef, useState } from "react";
import { AnimatePresence } from "motion/react";
import type { DragEndEvent } from "@dnd-kit/core";
import { closestCenter, DndContext } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ListChecks } from "lucide-react";
import { StateMessage } from "@/components/StateMessage";
import { Button } from "@/components/ui/button";
import { useSortableSensors, VERTICAL_LIST_MODIFIERS } from "@/lib/dnd";
import { localDayKey } from "@/lib/clock";
import { useNow } from "@/hooks/useNow";
import { useRovingFocus } from "@/hooks/useRovingFocus";
import { visibleTasks } from "@/widgets/tasks/lib/order";
import { getTaskData, useTasks, useTasksStore } from "@/widgets/tasks/useTasksStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import { TaskComposer } from "@/widgets/tasks/components/TaskComposer";
import { TaskRow } from "@/widgets/tasks/components/TaskRow";
import { TaskDetail } from "@/widgets/tasks/components/TaskDetail";
import { useTasksFilters, useTasksFilterStore } from "@/widgets/tasks/useTasksFilterStore";
import { useTaskActions } from "@/widgets/tasks/hooks/useTaskActions";
import type { TaskAction } from "@/widgets/tasks/lib/shortcuts";

export function TasksWidget() {
  const instanceId = useWidgetInstanceId();
  const tasks = useTasks((d) => d.tasks);
  const view = useTasks((d) => d.view ?? "all");
  const order = useTasks((d) => d.order ?? (d.autoSort ? "completion" : "focus"));
  const completedPosition = useTasks((d) => d.completedPosition);
  const showCompleted = useTasks((d) => d.showCompleted ?? true);
  const query = useTasksFilters((filter) => filter.query);
  const importantOnly = useTasksFilters((filter) => filter.importantOnly);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const returnTarget = useRef<HTMLButtonElement | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const day = localDayKey(useNow());
  const actions = useTaskActions();
  const shown = visibleTasks(
    tasks,
    view,
    day,
    order,
    completedPosition,
    showCompleted,
    query,
    importantOnly,
  );
  const selected = tasks.find((task) => task.id === selectedId);
  const sensors = useSortableSensors();
  const navigation = useRovingFocus({ count: shown.length, orientation: "vertical" });
  const canReorder =
    order === "manual" && !query.trim() && !importantOnly && view === "all" && showCompleted;
  const handleDragEnd = (event: DragEndEvent) => {
    if (canReorder && event.over && event.active.id !== event.over.id)
      useTasksStore
        .getState()
        .reorderTasks(instanceId, String(event.active.id), String(event.over.id));
  };
  const act = (id: string, action: TaskAction) => {
    const task = getTaskData(instanceId).tasks.find((task) => task.id === id);
    if (!task) return;
    if (action === "remove") actions.remove(id);
    else
      actions.save(id, {
        ...task,
        ...(action === "important"
          ? { important: !task.important }
          : { todayKey: task.todayKey === day ? null : day }),
      });
    const data = getTaskData(instanceId);
    if (
      !visibleTasks(
        data.tasks,
        view,
        day,
        order,
        completedPosition,
        showCompleted,
        query,
        importantOnly,
      ).some((entry) => entry.id === id)
    ) {
      const index = shown.findIndex((entry) => entry.id === id);
      const nextId = shown[index + 1]?.id ?? shown[index - 1]?.id;
      requestAnimationFrame(() => {
        const next = Array.from(
          root.current?.querySelectorAll<HTMLButtonElement>("[data-task-id]") ?? [],
        ).find((button) => button.dataset.taskId === nextId);
        (next ?? root.current?.querySelector<HTMLInputElement>("[data-task-composer]"))?.focus();
      });
    }
  };
  const returnFocus = () => {
    if (returnTarget.current?.isConnected) returnTarget.current.focus();
    else root.current?.querySelector<HTMLInputElement>("[data-task-composer]")?.focus();
  };
  const carried = tasks.filter((task) => !task.done && task.todayKey && task.todayKey < day);
  return (
    <div ref={root} className="flex h-full min-h-0 flex-col gap-2 pt-1">
      <TaskComposer
        day={day}
        today={view === "today"}
        importantOnly={importantOnly}
        onImportant={() =>
          useTasksFilterStore.getState().setFilter(instanceId, { importantOnly: !importantOnly })
        }
        order={order}
        onOrder={(value) => useTasksStore.getState().setOrder(instanceId, value)}
        onAdd={() => {
          useTasksFilterStore.getState().reset(instanceId);
        }}
      />
      {view === "today" && carried.length > 0 && !query && !importantOnly && (
        <Button
          variant="ghost"
          size="xs"
          className="justify-start"
          onClick={() =>
            carried.forEach((task) => actions.save(task.id, { ...task, todayKey: day }))
          }
        >
          Bring {carried.length} unfinished to today
        </Button>
      )}
      {shown.length === 0 ? (
        <StateMessage
          icon={ListChecks}
          message={
            query || importantOnly
              ? "No matching tasks"
              : view === "today"
                ? "Today is clear"
                : view === "completed"
                  ? "No completed tasks"
                  : "No tasks yet"
          }
          action={
            query || importantOnly ? (
              <Button
                variant="ghost"
                size="xs"
                onClick={() => {
                  useTasksFilterStore.getState().reset(instanceId);
                }}
              >
                Reset filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={VERTICAL_LIST_MODIFIERS}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={shown.map((task) => task.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul
              {...navigation.containerProps}
              className="
                scroll-fade flex min-h-0 flex-1 flex-col gap-0.5 overflow-x-hidden overflow-y-auto
                p-1
              "
            >
              <AnimatePresence initial={false} mode="popLayout">
                {shown.map((task, index) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    day={day}
                    sortable={canReorder}
                    navigation={navigation.itemProps(index)}
                    onToggle={() => actions.toggle(task.id)}
                    onOpen={() => {
                      returnTarget.current =
                        document.activeElement instanceof HTMLButtonElement
                          ? document.activeElement
                          : null;
                      setSelectedId(task.id);
                    }}
                    onAction={(action) => act(task.id, action)}
                  />
                ))}
              </AnimatePresence>
            </ul>
          </SortableContext>
        </DndContext>
      )}
      {selected && (
        <TaskDetail
          key={selected.id}
          task={selected}
          day={day}
          onSave={(draft) => {
            actions.save(selected.id, draft);
            setSelectedId(null);
          }}
          onClose={() => setSelectedId(null)}
          onReturnFocus={returnFocus}
        />
      )}
    </div>
  );
}
