import type { Task, TaskDraft } from "@/widgets/tasks/types";

export function withCompletion(task: Task, done: boolean): Task {
  return {
    ...task,
    done,
    ...(task.subtasks ? { subtasks: task.subtasks.map((child) => ({ ...child, done })) } : {}),
  };
}

export function applyDraft(task: Task, draft: TaskDraft): Task {
  const title = draft.title.trim();
  if (!title) return task;
  const subtasks = draft.subtasks
    ?.filter((child) => child.title.trim())
    .map((child) => ({ ...child, title: child.title.trim() }));
  return {
    ...task,
    ...draft,
    title,
    description: draft.description?.trim(),
    subtasks,
    done: subtasks?.length ? subtasks.every((child) => child.done) : task.done,
  };
}

export function parseTaskInput(value: string, todayKey: string, today: boolean): TaskDraft {
  let title = value.trim();
  let important = false;
  let scheduled = today;
  let match = /^\/(today|later|flag)(?:\s+|$)/i.exec(title);
  while (match) {
    const command = match[1]?.toLowerCase();
    if (command === "flag") important = true;
    else scheduled = command === "today";
    title = title.slice(match[0].length).trimStart();
    match = /^\/(today|later|flag)(?:\s+|$)/i.exec(title);
  }
  return { title, ...(important ? { important: true } : {}), ...(scheduled ? { todayKey } : {}) };
}
