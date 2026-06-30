import { create } from "zustand";
import { persist } from "zustand/middleware";
import { z } from "zod";
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
  done: z.boolean(),
  createdAt: z.number(),
});

const dataSchema = z.object({
  tasks: z.array(taskSchema),
  autoSort: z.boolean(),
  completedPosition: z.enum(["top", "bottom"]),
  removeOnCompletion: z.boolean().default(false),
});

const persistedSchema = z.object({
  byInstance: z.record(z.string(), dataSchema),
});

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
          const task: Task = { id, title: trimmed, done: false, createdAt: Date.now() };
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
      onRehydrateStorage: () => () => gatedStorage.open(),
      partialize: (state) => ({ byInstance: state.byInstance }),
      migrate: (persisted, version) => {
        if (version >= 2) return persisted;
        const legacy = dataSchema.safeParse(persisted);
        return { byInstance: legacy.success ? { tasks: legacy.data } : {} };
      },
      merge: (persisted, current) => {
        const parsed = persistedSchema.safeParse(persisted);
        if (!parsed.success) return current;
        return { ...current, byInstance: parsed.data.byInstance };
      },
    },
  ),
);

registerInstanceCleanup((instanceId) => useTasksStore.getState().removeInstance(instanceId));

export const useTasks = createInstanceSelector(useTasksStore, DEFAULT_TASKS);

export function getTaskData(instanceId: string): TaskData {
  return useTasksStore.getState().byInstance[instanceId] ?? DEFAULT_TASKS;
}
