import { ListTodo } from "lucide-react";
import type { WidgetPlugin } from "@/widgets/core/types";
import { TasksConfig } from "@/widgets/tasks/TasksConfig";
import { TasksWidget } from "@/widgets/tasks/TasksWidget";
import { ClearCompletedButton } from "@/widgets/tasks/components/ClearCompletedButton";
import { TasksStatus } from "@/widgets/tasks/components/TasksStatus";

export const tasksPlugin: WidgetPlugin = {
  type: "tasks",
  name: "Tasks",
  icon: ListTodo,
  defaultLayout: { w: 6, h: 6, minW: 6, minH: 6, maxW: 12, maxH: 12 },
  component: TasksWidget,
  configComponent: TasksConfig,
  statusComponent: TasksStatus,
  headerActionComponent: ClearCompletedButton,
  accent: "indigo",};
