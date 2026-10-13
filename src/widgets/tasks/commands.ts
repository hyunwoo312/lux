import { Plus } from "lucide-react";
import { instanceIds } from "@/widgets/core/instances";
import { needsWidget } from "@/widgets/core/commandSetup";
import type { WidgetCommand } from "@/widgets/core/types";
import { getTaskData, useTasksStore } from "@/widgets/tasks/useTasksStore";
import { parseTaskInput } from "@/widgets/tasks/lib/task";
import { localDayKey } from "@/lib/clock";
import { newId } from "@/lib/utils";
import { showToast } from "@/stores/useToastStore";

export const tasksCommands = (): WidgetCommand[] => [
  {
    kind: "provider",
    id: "tasks.add",
    label: "Add a task",
    description: "Capture a local task · /today, /later, /flag",
    icon: Plus,
    keywords: ["task", "todo", "checklist", "today"],
    placeholder: "Task title · /today or /flag",
    emptyMessage: () => "Type a task to add it.",
    setup: () => needsWidget("tasks", "Tasks"),
    search: async (query) => {
      const ids = instanceIds("tasks");
      return ids.flatMap((instanceId, index) => {
        const data = getTaskData(instanceId);
        const draft = parseTaskInput(query, localDayKey(new Date()), data.view === "today");
        if (!draft.title) return [];
        return [
          {
            id: `tasks.add.${instanceId}`,
            label: `Add “${draft.title}”`,
            detail: `${ids.length > 1 ? `Tasks ${index + 1} · ` : ""}${draft.todayKey ? "Today" : "Later"}${draft.important ? " · Important" : ""}`,
            icon: Plus,
            run: () => {
              const { title, ...details } = parseTaskInput(
                query,
                localDayKey(new Date()),
                getTaskData(instanceId).view === "today",
              );
              useTasksStore.getState().addTask(instanceId, title, newId("task"), details);
              const view = getTaskData(instanceId).view;
              if (view === "completed" || (view === "today" && !details.todayKey))
                useTasksStore.getState().setView(instanceId, details.todayKey ? "today" : "all");
              showToast({ key: `${instanceId}-added`, message: `Added “${title}”` });
            },
          },
        ];
      });
    },
  },
];
