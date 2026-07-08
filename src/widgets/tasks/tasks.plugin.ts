import { ListTodo } from "lucide-react";
import type { WidgetPlugin } from "@/widgets/core/types";
import { TasksConfig } from "@/widgets/tasks/TasksConfig";
import { TasksWidget } from "@/widgets/tasks/TasksWidget";
import { ClearCompletedButton } from "@/widgets/tasks/components/ClearCompletedButton";
import { TasksStatus } from "@/widgets/tasks/components/TasksStatus";
import { useTasksStore } from "@/widgets/tasks/useTasksStore";

export const tasksPlugin: WidgetPlugin = {
  type: "tasks",
  name: "Tasks",
  description: "A simple to-do list for the day",
  recommended: true,
  icon: ListTodo,
  defaultLayout: { w: 6, h: 6, minW: 6, minH: 6, maxW: 12, maxH: 12 },
  component: TasksWidget,
  configComponent: TasksConfig,
  statusComponent: TasksStatus,
  headerActionComponent: ClearCompletedButton,
  accent: "indigo",
  removalNote: (instanceId) => {
    const count = useTasksStore.getState().byInstance[instanceId]?.tasks.length ?? 0;
    if (count === 0) return null;
    return `Your ${count} ${count === 1 ? "task" : "tasks"} will be deleted.`;
  },
};
