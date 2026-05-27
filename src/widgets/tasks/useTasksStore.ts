import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { z } from "zod";
import { createGatedChromeStorage } from "@/lib/storage";
import type { CompletedPosition, Task } from "@/widgets/tasks/types";

type TasksState = {
  tasks: Task[];
  autoSort: boolean;
  completedPosition: CompletedPosition;
  removeOnCompletion: boolean;
  addTask: (title: string, id: string) => void;
  toggleTask: (id: string) => void;
  editTask: (id: string, title: string) => void;
  removeTask: (id: string) => void;
  clearCompleted: () => void;
  reorderTasks: (activeId: string, overId: string) => void;
  setAutoSort: (autoSort: boolean) => void;
  setCompletedPosition: (completedPosition: CompletedPosition) => void;
  setRemoveOnCompletion: (removeOnCompletion: boolean) => void;
};

const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  done: z.boolean(),
  createdAt: z.number(),
});

const persistedSchema = z.object({
  tasks: z.array(taskSchema),
  autoSort: z.boolean(),
  completedPosition: z.enum(["top", "bottom"]),
  removeOnCompletion: z.boolean().default(false),
});

const gatedStorage = createGatedChromeStorage();

export const useTasksStore = create<TasksState>()(
  persist(
    (set) => ({
      tasks: [],
      autoSort: false,
      completedPosition: "bottom",
      removeOnCompletion: false,
      addTask: (title, id) =>
        set((state) => {
          const trimmed = title.trim();
          if (!trimmed) return state;
          const task: Task = {
            id,
            title: trimmed,
            done: false,
            createdAt: Date.now(),
          };
          return { tasks: [...state.tasks, task] };
        }),
      toggleTask: (id) =>
        set((state) => ({
          tasks: state.tasks.map((task) => (task.id === id ? { ...task, done: !task.done } : task)),
        })),
      editTask: (id, title) =>
        set((state) => {
          const trimmed = title.trim();
          if (!trimmed) return state;
          return {
            tasks: state.tasks.map((task) =>
              task.id === id ? { ...task, title: trimmed } : task,
            ),
          };
        }),
      removeTask: (id) =>
        set((state) => ({ tasks: state.tasks.filter((task) => task.id !== id) })),
      clearCompleted: () => set((state) => ({ tasks: state.tasks.filter((task) => !task.done) })),
      reorderTasks: (activeId, overId) =>
        set((state) => {
          const from = state.tasks.findIndex((task) => task.id === activeId);
          const to = state.tasks.findIndex((task) => task.id === overId);
          if (from === -1 || to === -1 || from === to) return state;
          const tasks = [...state.tasks];
          const [moved] = tasks.splice(from, 1);
          if (!moved) return state;
          tasks.splice(to, 0, moved);
          return { tasks };
        }),
      setAutoSort: (autoSort) => set({ autoSort }),
      setCompletedPosition: (completedPosition) => set({ completedPosition }),
      setRemoveOnCompletion: (removeOnCompletion) => set({ removeOnCompletion }),
    }),
    {
      name: "widget:tasks",
      storage: createJSONStorage(() => gatedStorage),
      version: 1,
      onRehydrateStorage: () => () => gatedStorage.open(),
      partialize: (state) => ({
        tasks: state.tasks,
        autoSort: state.autoSort,
        completedPosition: state.completedPosition,
        removeOnCompletion: state.removeOnCompletion,
      }),
      merge: (persisted, current) => {
        const parsed = persistedSchema.safeParse(persisted);
        if (!parsed.success) return current;
        return { ...current, ...parsed.data };
      },
    },
  ),
);
