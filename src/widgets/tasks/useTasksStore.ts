import { z } from "zod";
import { looksLikeLegacySingleton, tolerantArray, tolerantRecord } from "@/lib/persist";
import { moveById } from "@/lib/dnd";
import { createPersistedStore } from "@/lib/storage";
import { dropInstance, patchInstance } from "@/widgets/core/byInstance";
import { createInstanceSelector } from "@/widgets/core/useWidgetInstance";
import {
  TASK_VIEWS,
  TASK_ORDERS,
  type CompletedPosition,
  type Task,
  type TaskDraft,
  type TasksView,
  type TasksOrder,
} from "@/widgets/tasks/types";
import { applyDraft, withCompletion } from "@/widgets/tasks/lib/task";
import { dateFromDayKey } from "@/lib/clock";

type TaskData = {
  tasks: Task[];
  autoSort: boolean;
  completedPosition: CompletedPosition;
  removeOnCompletion: boolean;
  view?: TasksView;
  order?: TasksOrder;
  showCompleted?: boolean;
};

type TasksState = {
  byInstance: Record<string, TaskData>;
  addTask: (
    instanceId: string,
    title: string,
    id: string,
    details?: Omit<TaskDraft, "title">,
  ) => void;
  saveTask: (instanceId: string, id: string, draft: TaskDraft) => void;
  setView: (instanceId: string, view: TasksView) => void;
  setOrder: (instanceId: string, order: TasksOrder) => void;
  setShowCompleted: (instanceId: string, show: boolean) => void;
  toggleTask: (instanceId: string, id: string) => void;
  removeTask: (instanceId: string, id: string) => void;
  clearCompleted: (instanceId: string) => void;
  restoreTasks: (instanceId: string, tasks: Task[], positions?: Record<string, number>) => void;
  reorderTasks: (instanceId: string, activeId: string, overId: string) => void;
  setCompletedPosition: (instanceId: string, completedPosition: CompletedPosition) => void;
  setRemoveOnCompletion: (instanceId: string, removeOnCompletion: boolean) => void;
  removeInstance: (instanceId: string) => void;
};

const DEFAULT_TASKS: TaskData = {
  tasks: [],
  autoSort: false,
  completedPosition: "bottom",
  removeOnCompletion: false,
  view: "all",
  order: "focus",
  showCompleted: true,
};

const subtaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  done: z.boolean().catch(false),
});

const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  done: z.boolean().catch(false),
  description: z.string().optional().catch(undefined),
  important: z.boolean().optional().catch(false),
  todayKey: z
    .string()
    .refine((key) => dateFromDayKey(key) !== null)
    .nullable()
    .optional()
    .catch(null),
  subtasks: tolerantArray(subtaskSchema).optional().catch([]),
});

const dataSchema = z.object({
  tasks: tolerantArray(taskSchema),
  autoSort: z.boolean().catch(false),
  completedPosition: z.enum(["top", "bottom"]).catch("bottom"),
  removeOnCompletion: z.boolean().catch(false),
  view: z.enum(TASK_VIEWS).optional().catch("all"),
  order: z.enum(TASK_ORDERS).optional().catch("focus"),
  showCompleted: z.boolean().optional().catch(true),
});

const persistedSchema = z.object({ byInstance: tolerantRecord(dataSchema) });

function update(
  state: TasksState,
  instanceId: string,
  fn: (data: TaskData) => TaskData,
): Pick<TasksState, "byInstance"> {
  return { byInstance: patchInstance(state.byInstance, instanceId, DEFAULT_TASKS, fn) };
}

export const useTasksStore = createPersistedStore<TasksState>()(
  (set) => ({
    byInstance: {},
    addTask: (instanceId, title, id, details) =>
      set((state) => {
        const trimmed = title.trim();
        if (!trimmed) return state;
        const task: Task = { id, title: trimmed, done: false, ...details };
        return update(state, instanceId, (data) => ({ ...data, tasks: [...data.tasks, task] }));
      }),
    saveTask: (instanceId, id, draft) =>
      set((state) =>
        update(state, instanceId, (data) => ({
          ...data,
          tasks: data.tasks.map((task) => (task.id === id ? applyDraft(task, draft) : task)),
        })),
      ),
    setView: (instanceId, view) =>
      set((state) => update(state, instanceId, (data) => ({ ...data, view }))),
    setOrder: (instanceId, order) =>
      set((state) => update(state, instanceId, (data) => ({ ...data, order }))),
    setShowCompleted: (instanceId, showCompleted) =>
      set((state) => update(state, instanceId, (data) => ({ ...data, showCompleted }))),
    toggleTask: (instanceId, id) =>
      set((state) =>
        update(state, instanceId, (data) => ({
          ...data,
          tasks: data.tasks.map((task) =>
            task.id === id ? withCompletion(task, !task.done) : task,
          ),
        })),
      ),
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
    restoreTasks: (instanceId, tasks, positions) =>
      set((state) =>
        update(state, instanceId, (data) => {
          const existing = new Set(data.tasks.map((task) => task.id));
          const restored = tasks.filter((task) => !existing.has(task.id));
          if (restored.length === 0) return data;
          const next = [...data.tasks];
          for (const task of [...restored].sort(
            (a, b) => (positions?.[a.id] ?? Infinity) - (positions?.[b.id] ?? Infinity),
          )) {
            next.splice(Math.min(positions?.[task.id] ?? next.length, next.length), 0, task);
          }
          return { ...data, tasks: next };
        }),
      ),
    reorderTasks: (instanceId, activeId, overId) =>
      set((state) => {
        const data = state.byInstance[instanceId] ?? DEFAULT_TASKS;
        const tasks = moveById(data.tasks, activeId, overId, (task) => task.id);
        if (!tasks) return state;
        return update(state, instanceId, (current) => ({ ...current, tasks }));
      }),
    setCompletedPosition: (instanceId, completedPosition) =>
      set((state) => update(state, instanceId, (data) => ({ ...data, completedPosition }))),
    setRemoveOnCompletion: (instanceId, removeOnCompletion) =>
      set((state) => update(state, instanceId, (data) => ({ ...data, removeOnCompletion }))),
    removeInstance: (instanceId) =>
      set((state) => ({ byInstance: dropInstance(state.byInstance, instanceId) })),
  }),
  {
    name: "widget:tasks",
    version: 2,
    partialize: (state) => ({ byInstance: state.byInstance }),
    migrate: (persisted, version) => {
      if (version >= 2) return persisted;
      if (!looksLikeLegacySingleton(persisted, ["tasks"])) return { byInstance: {} };
      const legacy = dataSchema.safeParse(persisted);
      return { byInstance: legacy.success ? { tasks: legacy.data } : {} };
    },
    schema: persistedSchema,
    build: (parsed, current) => ({
      ...current,
      byInstance: Object.fromEntries(
        Object.entries(parsed.byInstance).map(([id, data]) => [
          id,
          data.removeOnCompletion
            ? { ...data, tasks: data.tasks.filter((task) => !task.done) }
            : data,
        ]),
      ),
    }),
  },
);

export const useTasks = createInstanceSelector(useTasksStore, DEFAULT_TASKS);

export function getTaskData(instanceId: string): TaskData {
  return useTasksStore.getState().byInstance[instanceId] ?? DEFAULT_TASKS;
}
