import { create } from "zustand";
import { persist } from "zustand/middleware";
import { z } from "zod";
import { mergePersisted, tolerantArray, tolerantRecord } from "@/lib/persist";
import { createGatedChromeStorage } from "@/lib/storage";
import { registerInstanceCleanup } from "@/widgets/core/instanceCleanup";
import { dropInstance, patchInstance } from "@/widgets/core/byInstance";
import { createInstanceSelector } from "@/widgets/core/useWidgetInstance";
import type { CompletedPosition, Task } from "@/widgets/tasks/types";

type TaskData = {
  tasks: Task[];
  autoSort: boolean;
  completedPosition: CompletedPosition;
  removeOnCompletion: boolean;
};

type TasksState = {
  byInstance: Record<string, TaskData>;
  addTask: (instanceId: string, title: string, id: string) => void;
  toggleTask: (instanceId: string, id: string) => void;
  editTask: (instanceId: string, id: string, title: string) => void;
  removeTask: (instanceId: string, id: string) => void;
  clearCompleted: (instanceId: string) => void;
  restoreTasks: (instanceId: string, tasks: Task[]) => void;
  reorderTasks: (instanceId: string, activeId: string, overId: string) => void;
  setAutoSort: (instanceId: string, autoSort: boolean) => void;
  setCompletedPosition: (instanceId: string, completedPosition: CompletedPosition) => void;
  setRemoveOnCompletion: (instanceId: string, removeOnCompletion: boolean) => void;
  removeInstance: (instanceId: string) => void;
};

const DEFAULT_TASKS: TaskData = {
  tasks: [],
  autoSort: false,
  completedPosition: "bottom",
  removeOnCompletion: false,
};

const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  done: z.boolean().catch(false),
});

const dataSchema = z.object({
  tasks: tolerantArray(taskSchema),
  autoSort: z.boolean().catch(false),
  completedPosition: z.enum(["top", "bottom"]).catch("bottom"),
  removeOnCompletion: z.boolean().catch(false),
});

const persistedSchema = z.object({ byInstance: tolerantRecord(dataSchema) });

function looksLikeLegacySingleton(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  return "tasks" in value && Array.isArray(value.tasks);
}

const gatedStorage = createGatedChromeStorage();

function update(
  state: TasksState,
  instanceId: string,
  fn: (data: TaskData) => TaskData,
): Pick<TasksState, "byInstance"> {
  return { byInstance: patchInstance(state.byInstance, instanceId, DEFAULT_TASKS, fn) };
}

export const useTasksStore = create<TasksState>()(
  persist(
    (set) => ({
      byInstance: {},
      addTask: (instanceId, title, id) =>
        set((state) => {
          const trimmed = title.trim();
          if (!trimmed) return state;
          const task: Task = { id, title: trimmed, done: false };
          return update(state, instanceId, (data) => ({ ...data, tasks: [...data.tasks, task] }));
        }),
      toggleTask: (instanceId, id) =>
        set((state) =>
          update(state, instanceId, (data) => ({
            ...data,
            tasks: data.tasks.map((task) =>
              task.id === id ? { ...task, done: !task.done } : task,
            ),
          })),
        ),
      editTask: (instanceId, id, title) =>
        set((state) => {
          const trimmed = title.trim();
          if (!trimmed) return state;
          return update(state, instanceId, (data) => ({
            ...data,
            tasks: data.tasks.map((task) => (task.id === id ? { ...task, title: trimmed } : task)),
          }));
        }),
      removeTask: (instanceId, id) =>
        set((state) =>
          update(state, instanceId, (data) => ({
            ...data,
            tasks: data.tasks.filter((task) => task.id !== id),
          })),
        ),
      clearCompleted: (instanceId) =>
        set((state) =>
          update(state, instanceId, (data) => ({
            ...data,
            tasks: data.tasks.filter((task) => !task.done),
          })),
        ),
      restoreTasks: (instanceId, tasks) =>
        set((state) =>
          update(state, instanceId, (data) => {
            const existing = new Set(data.tasks.map((task) => task.id));
            const restored = tasks.filter((task) => !existing.has(task.id));
            return restored.length === 0 ? data : { ...data, tasks: [...data.tasks, ...restored] };
          }),
        ),
      reorderTasks: (instanceId, activeId, overId) =>
        set((state) => {
          const data = state.byInstance[instanceId] ?? DEFAULT_TASKS;
          const from = data.tasks.findIndex((task) => task.id === activeId);
          const to = data.tasks.findIndex((task) => task.id === overId);
          if (from === -1 || to === -1 || from === to) return state;
          const tasks = [...data.tasks];
          const [moved] = tasks.splice(from, 1);
          if (!moved) return state;
          tasks.splice(to, 0, moved);
          return update(state, instanceId, (current) => ({ ...current, tasks }));
        }),
      setAutoSort: (instanceId, autoSort) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, autoSort }))),
      setCompletedPosition: (instanceId, completedPosition) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, completedPosition }))),
      setRemoveOnCompletion: (instanceId, removeOnCompletion) =>
        set((state) => update(state, instanceId, (data) => ({ ...data, removeOnCompletion }))),
      removeInstance: (instanceId) =>
        set((state) => ({ byInstance: dropInstance(state.byInstance, instanceId) })),
    }),
    {
      name: "widget:tasks",
      storage: gatedStorage,
      version: 2,
      onRehydrateStorage: () => () => gatedStorage.open(useTasksStore),
      partialize: (state) => ({ byInstance: state.byInstance }),
      migrate: (persisted, version) => {
        if (version >= 2) return persisted;
        if (!looksLikeLegacySingleton(persisted)) return { byInstance: {} };
        const legacy = dataSchema.safeParse(persisted);
        return { byInstance: legacy.success ? { tasks: legacy.data } : {} };
      },
      merge: (persisted, current) =>
        mergePersisted("widget:tasks", persistedSchema, persisted, current, (parsed) => ({
          ...current,
          byInstance: Object.fromEntries(
            Object.entries(parsed.byInstance).map(([id, data]) => [
              id,
              data.removeOnCompletion
                ? { ...data, tasks: data.tasks.filter((task) => !task.done) }
                : data,
            ]),
          ),
        })),
    },
  ),
);

registerInstanceCleanup((instanceId) => useTasksStore.getState().removeInstance(instanceId));

export const useTasks = createInstanceSelector(useTasksStore, DEFAULT_TASKS);

export function getTaskData(instanceId: string): TaskData {
  return useTasksStore.getState().byInstance[instanceId] ?? DEFAULT_TASKS;
}
