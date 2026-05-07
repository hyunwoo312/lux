import { orderTasks } from "@/widgets/tasks/lib/order";
import type { Task } from "@/widgets/tasks/types";

const task = (id: string, done: boolean): Task => ({
  id,
  title: id,
  done,
  createdAt: 0,
});

describe("orderTasks", () => {
  const tasks = [task("a", false), task("b", true), task("c", false), task("d", true)];

  it("keeps insertion order when auto-sort is off", () => {
    expect(orderTasks(tasks, false, "bottom").map((t) => t.id)).toEqual(["a", "b", "c", "d"]);
  });

  it("pushes completed tasks to the bottom, preserving relative order", () => {
    expect(orderTasks(tasks, true, "bottom").map((t) => t.id)).toEqual(["a", "c", "b", "d"]);
  });

  it("pushes completed tasks to the top, preserving relative order", () => {
    expect(orderTasks(tasks, true, "top").map((t) => t.id)).toEqual(["b", "d", "a", "c"]);
  });

  it("does not mutate the input array", () => {
    const input = [task("a", true), task("b", false)];
    orderTasks(input, true, "bottom");
    expect(input.map((t) => t.id)).toEqual(["a", "b"]);
  });
});
