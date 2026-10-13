import { ListTodo, Sun, CheckCheck } from "lucide-react";
import { ConfigSelect } from "@/components/config/Config";
import { useNow } from "@/hooks/useNow";
import { localDayKey } from "@/lib/clock";
import { ClearCompletedButton } from "@/widgets/tasks/components/ClearCompletedButton";
import { useTasks, useTasksStore } from "@/widgets/tasks/useTasksStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import { useTasksFilters } from "@/widgets/tasks/useTasksFilterStore";

export function TasksHeaderActions() {
  const instanceId = useWidgetInstanceId();
  const tasks = useTasks((d) => d.tasks);
  const view = useTasks((d) => d.view ?? "all");
  const day = localDayKey(useNow());
  const searching = useTasksFilters((filter) => filter.searchOpen || Boolean(filter.query));
  if (searching) return null;
  return (
    <div className="flex items-center gap-0.5">
      <ClearCompletedButton />
      <ConfigSelect
        label="Tasks view"
        icon={view === "all" ? ListTodo : view === "today" ? Sun : CheckCheck}
        value={view}
        options={[
          { value: "all", label: `All · ${tasks.length}` },
          {
            value: "today",
            label: `Today · ${tasks.filter((task) => task.todayKey === day).length}`,
          },
          { value: "completed", label: `Done · ${tasks.filter((task) => task.done).length}` },
        ]}
        onChange={(next) => useTasksStore.getState().setView(instanceId, next)}
        triggerClassName="h-7 w-28 gap-1.5 text-caption"
      />
    </div>
  );
}
