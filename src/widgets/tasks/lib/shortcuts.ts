export const TASK_SHORTCUTS = {
  important: { key: "f", hint: "F · important" },
  today: { key: "t", hint: "T · today" },
  remove: { key: "Delete", hint: "Delete · remove" },
} as const;

export type TaskAction = keyof typeof TASK_SHORTCUTS;

export function taskActionFor(event: {
  key: string;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
}): TaskAction | null {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return null;
  for (const action of ["important", "today", "remove"] as const) {
    if (event.key.toLowerCase() === TASK_SHORTCUTS[action].key.toLowerCase()) return action;
  }
  return null;
}
