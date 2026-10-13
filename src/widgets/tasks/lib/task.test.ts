import { describe, expect, it } from "vitest";
import { applyDraft, parseTaskInput, withCompletion } from "@/widgets/tasks/lib/task";
import { visibleTasks } from "@/widgets/tasks/lib/order";
import type { Task } from "@/widgets/tasks/types";

describe("task planning", () => {
  it("previews explicit capture commands while preserving ordinary text", () => {
    expect(parseTaskInput("/today /flag Write report", "2026-10-13", false)).toEqual({
      title: "Write report",
      important: true,
      todayKey: "2026-10-13",
    });
    expect(parseTaskInput("/later tomorrow at 4", "2026-10-13", true)).toEqual({
      title: "tomorrow at 4",
    });
    expect(parseTaskInput("/today", "2026-10-13", false).title).toBe("");
    expect(parseTaskInput("/todayish words", "2026-10-13", false).title).toBe("/todayish words");
  });
  it("checks a checklist as a whole and derives completion only for nonempty checklists", () => {
    const task: Task = {
      id: "p",
      title: "Plan",
      done: false,
      subtasks: [{ id: "c", title: "Step", done: false }],
    };
    expect(withCompletion(task, true).subtasks?.[0]?.done).toBe(true);
    expect(withCompletion(withCompletion(task, true), false).subtasks?.[0]?.done).toBe(false);
    expect(
      applyDraft(task, { title: " Plan ", subtasks: [{ id: "c", title: "Step", done: true }] })
        .done,
    ).toBe(true);
    expect(applyDraft(task, { title: "Plan", subtasks: [] }).done).toBe(false);
    expect(applyDraft(task, { title: " " })).toBe(task);
  });
  it("filters daily focus at midnight without moving or losing saved tasks", () => {
    const tasks: Task[] = [
      { id: "a", title: "Old", todayKey: "2026-10-12", done: false },
      { id: "b", title: "Today", todayKey: "2026-10-13", done: false },
      { id: "c", title: "Flag", important: true, done: false },
      { id: "d", title: "Done", important: true, done: true },
    ];
    expect(
      visibleTasks(tasks, "today", "2026-10-13", "focus", "bottom", true, "", false).map(
        (t) => t.id,
      ),
    ).toEqual(["b"]);
    expect(
      visibleTasks(tasks, "all", "2026-10-14", "focus", "bottom", true, "", false).map((t) => t.id),
    ).toEqual(["c", "a", "b", "d"]);
    expect(
      visibleTasks(tasks, "completed", "2026-10-14", "manual", "bottom", false, "", false).map(
        (t) => t.id,
      ),
    ).toEqual(["d"]);
    expect(tasks.map((t) => t.id)).toEqual(["a", "b", "c", "d"]);
  });
});
