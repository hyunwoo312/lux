import { useTasksStore } from "@/widgets/tasks/useTasksStore";

const store = () => useTasksStore.getState();

describe("useTasksStore", () => {
  beforeEach(() => {
    useTasksStore.setState({ tasks: [] });
  });

  it("clears only completed tasks", () => {
    store().addTask("a", "1");
    store().addTask("b", "2");
    store().toggleTask("2");

    store().clearCompleted();

    expect(store().tasks.map((task) => task.id)).toEqual(["1"]);
  });

  it("moves a task to another task's position", () => {
    store().addTask("a", "1");
    store().addTask("b", "2");
    store().addTask("c", "3");

    store().reorderTasks("1", "3");

    expect(store().tasks.map((task) => task.id)).toEqual(["2", "3", "1"]);
  });

  it("ignores a reorder when an id is unknown", () => {
    store().addTask("a", "1");
    store().addTask("b", "2");

    store().reorderTasks("1", "missing");

    expect(store().tasks.map((task) => task.id)).toEqual(["1", "2"]);
  });
});
