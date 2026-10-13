import { create } from "zustand";
import { dropInstance, patchInstance } from "@/widgets/core/byInstance";
import { createInstanceSelector } from "@/widgets/core/useWidgetInstance";

type TaskFilters = { query: string; importantOnly: boolean; searchOpen: boolean };
const DEFAULT_FILTERS: TaskFilters = { query: "", importantOnly: false, searchOpen: false };

export const useTasksFilterStore = create<{
  byInstance: Record<string, TaskFilters>;
  setFilter: (instanceId: string, filter: Partial<TaskFilters>) => void;
  reset: (instanceId: string) => void;
}>((set) => ({
  byInstance: {},
  setFilter: (instanceId, filter) =>
    set((state) => ({
      byInstance: patchInstance(state.byInstance, instanceId, DEFAULT_FILTERS, (current) => ({
        ...current,
        ...filter,
      })),
    })),
  reset: (instanceId) =>
    set((state) => ({ byInstance: dropInstance(state.byInstance, instanceId) })),
}));

export const useTasksFilters = createInstanceSelector(useTasksFilterStore, DEFAULT_FILTERS);
