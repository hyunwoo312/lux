import { ExpandingSearch } from "@/components/ExpandingSearch";
import { useTasksFilters, useTasksFilterStore } from "@/widgets/tasks/useTasksFilterStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";

export function TasksSearch() {
  const instanceId = useWidgetInstanceId();
  const { query, searchOpen } = useTasksFilters((filter) => filter);
  return (
    <ExpandingSearch
      open={searchOpen || Boolean(query)}
      onOpenChange={(searchOpen) =>
        useTasksFilterStore.getState().setFilter(instanceId, { searchOpen })
      }
      value={query}
      onValueChange={(value) =>
        useTasksFilterStore.getState().setFilter(instanceId, { query: value })
      }
      ariaLabel="Find tasks"
      inputRole="searchbox"
      placeholder="Find tasks…"
      className="-ml-1.5"
    />
  );
}
