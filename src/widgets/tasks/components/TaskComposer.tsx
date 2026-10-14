import { useRef, useState } from "react";
import { Sun, Inbox, Plus, Flag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { IconActionButton } from "@/components/IconActionButton";
import { newId } from "@/lib/utils";
import { parseTaskInput } from "@/widgets/tasks/lib/task";
import { useTasksStore } from "@/widgets/tasks/useTasksStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import { TaskOrderMenu } from "@/widgets/tasks/components/TaskOrderMenu";
import type { TasksOrder } from "@/widgets/tasks/types";

export function TaskComposer({
  day,
  today,
  onAdd,
  importantOnly,
  onImportant,
  order,
  onOrder,
}: {
  day: string;
  today: boolean;
  onAdd: () => void;
  importantOnly: boolean;
  onImportant: () => void;
  order: TasksOrder;
  onOrder: (value: TasksOrder) => void;
}) {
  const instanceId = useWidgetInstanceId();
  const input = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const draft = parseTaskInput(title, day, today);
  const planToday = Boolean(draft.todayKey);
  const hasCommands = draft.title !== title.trim();
  return (
    <form
      className="shrink-0"
      onSubmit={(event) => {
        event.preventDefault();
        if (!draft.title) return;
        const { title: text, ...details } = draft;
        useTasksStore.getState().addTask(instanceId, text, newId("task"), details);
        setTitle("");
        const view = useTasksStore.getState().byInstance[instanceId]?.view;
        if (view === "completed" || (view === "today" && !draft.todayKey))
          useTasksStore.getState().setView(instanceId, draft.todayKey ? "today" : "all");
        onAdd();
        input.current?.focus();
      }}
    >
      <div className="flex items-center gap-1">
        <Input
          ref={input}
          aria-label="Add a task"
          data-task-composer
          placeholder="Add a task…"
          name="task-title"
          autoComplete="off"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="focus-ring-single min-w-0 flex-1"
        />
        <Button
          type="submit"
          variant="ghost"
          size="icon"
          aria-label="Add task"
          disabled={!draft.title}
        >
          <Plus aria-hidden />
        </Button>
        <IconActionButton
          icon={Flag}
          label="Important tasks only"
          tooltip="Important only"
          pressed={importantOnly}
          onClick={onImportant}
        />
        <IconActionButton
          icon={planToday ? Sun : Inbox}
          label="Add to today"
          pressed={planToday}
          tooltip={planToday ? "Adding to Today" : "Adding to Later"}
          onClick={() => {
            setTitle(
              `/${planToday ? "later" : "today"} ${draft.important ? "/flag " : ""}${draft.title}`,
            );
            input.current?.focus();
          }}
        />
        <TaskOrderMenu order={order} onOrder={onOrder} />
      </div>
      {hasCommands && (
        <p role="status" className="text-ink-3 pt-1 text-micro">
          {draft.todayKey ? "Today" : "Later"}
          {draft.important ? " · Important" : ""}
          {draft.title ? " · " + draft.title : " · Enter a task title"}
        </p>
      )}
    </form>
  );
}
