import { useTasksStore } from "@/widgets/tasks/useTasksStore";

const store = () => useTasksStore.getState();
const ID = "tasks-1";

describe("useTasksStore", () => {
  beforeEach(() => {
    useTasksStore.setState({ byInstance: {} });
  });

  it("clears only completed tasks", () => {
    store().addTask(ID, "a", "1");
    store().addTask(ID, "b", "2");
    store().toggleTask(ID, "2");

    store().clearCompleted(ID);

    expect(store().byInstance[ID]?.tasks.map((task) => task.id)).toEqual(["1"]);
  });

  it("moves a task to another task's position", () => {
    store().addTask(ID, "a", "1");
    store().addTask(ID, "b", "2");
    store().addTask(ID, "c", "3");

    store().reorderTasks(ID, "1", "3");

    expect(store().byInstance[ID]?.tasks.map((task) => task.id)).toEqual(["2", "3", "1"]);
  });

  it("ignores a reorder when an id is unknown", () => {
    store().addTask(ID, "a", "1");
    store().addTask(ID, "b", "2");

    store().reorderTasks(ID, "1", "missing");

    expect(store().byInstance[ID]?.tasks.map((task) => task.id)).toEqual(["1", "2"]);
  });

  it("keeps instances independent", () => {
    store().addTask("a", "alpha", "1");
    store().addTask("b", "beta", "2");

    expect(store().byInstance["a"]?.tasks.map((task) => task.title)).toEqual(["alpha"]);
    expect(store().byInstance["b"]?.tasks.map((task) => task.title)).toEqual(["beta"]);
  });

  it("drops an instance's data on cleanup", () => {
    store().addTask(ID, "a", "1");

    store().removeInstance(ID);

    expect(store().byInstance[ID]).toBeUndefined();
  });

  describe("migrate", () => {
    const migrate = useTasksStore.persist.getOptions().migrate;

    it("migrates legacy singleton data under the tasks instance key", () => {
      const legacy = {
        tasks: [{ id: "1", title: "a", done: false, createdAt: 1000 }],
        autoSort: true,
        completedPosition: "top",
      };

      expect(migrate?.(legacy, 1)).toEqual({
        byInstance: {
          tasks: {
            tasks: [{ id: "1", title: "a", done: false, createdAt: 1000 }],
            autoSort: true,
            completedPosition: "top",
            removeOnCompletion: false,
          },
        },
      });
    });

    it("drops unrecognized legacy data", () => {
      expect(migrate?.({ bogus: true }, 1)).toEqual({ byInstance: {} });
    });

    it("passes current-version data through unchanged", () => {
      const persisted = {
        byInstance: {
          [ID]: {
            tasks: [],
            autoSort: false,
            completedPosition: "bottom",
            removeOnCompletion: false,
          },
        },
      };
      expect(migrate?.(persisted, 2)).toBe(persisted);
    });
  });
});
