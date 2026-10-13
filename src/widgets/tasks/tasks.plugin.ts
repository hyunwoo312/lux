import { ListTodo } from "lucide-react";
import type { WidgetPlugin } from "@/widgets/core/types";
import { TasksConfig } from "@/widgets/tasks/TasksConfig";
import { TasksWidget } from "@/widgets/tasks/TasksWidget";
import { TasksHeaderActions } from "@/widgets/tasks/components/TasksHeaderActions";
import { tasksCommands } from "@/widgets/tasks/commands";
import { TasksSearch } from "@/widgets/tasks/components/TasksSearch";
import { useTasksFilterStore } from "@/widgets/tasks/useTasksFilterStore";
import { useTasksStore } from "@/widgets/tasks/useTasksStore";
import { TASKS_TINT } from "@/widgets/tasks/types";

export const tasksPlugin: WidgetPlugin = {
  type: "tasks",
  name: "Tasks",
  category: "productivity",
  description: "A simple to-do list for the day",
  recommended: true,
  icon: ListTodo,
  component: TasksWidget,
  clearInstance: (instanceId) => {
    useTasksStore.getState().removeInstance(instanceId);
    useTasksFilterStore.getState().reset(instanceId);
  },
  configComponent: TasksConfig,
  statusComponent: TasksSearch,
  headerActionComponent: TasksHeaderActions,
  commands: tasksCommands,
  tint: TASKS_TINT,
  removalNote: (instanceId) => {
    const count = useTasksStore.getState().byInstance[instanceId]?.tasks.length ?? 0;
    if (count === 0) return null;
    return `Your ${count} ${count === 1 ? "task" : "tasks"} will be deleted.`;
  },
};
