import { useTasksStore } from "@/widgets/tasks/useTasksStore";

const store = () => useTasksStore.getState();
const ID = "tasks-1";

describe("useTasksStore", () => {
  beforeEach(() => {
    useTasksStore.setState({ byInstance: {} });
  });

  it("adds a task with its title trimmed", () => {
    store().addTask(ID, "  buy milk  ", "1");
    expect(store().byInstance[ID]?.tasks).toEqual([{ id: "1", title: "buy milk", done: false }]);
  });

  it("ignores a task with nothing but whitespace in it", () => {
    store().addTask(ID, "   ", "1");
    expect(store().byInstance[ID]?.tasks ?? []).toEqual([]);
  });

  it("adds new tasks to the end of the list", () => {
    store().addTask(ID, "a", "1");
    store().addTask(ID, "b", "2");
    expect(store().byInstance[ID]?.tasks.map((task) => task.id)).toEqual(["1", "2"]);
  });

  it("toggles a task done and back again", () => {
    store().addTask(ID, "a", "1");
    store().toggleTask(ID, "1");
    expect(store().byInstance[ID]?.tasks[0]?.done).toBe(true);
    store().toggleTask(ID, "1");
    expect(store().byInstance[ID]?.tasks[0]?.done).toBe(false);
  });

  it("edits a task's title, trimmed", () => {
    store().addTask(ID, "a", "1");
    store().editTask(ID, "1", "  renamed  ");
    expect(store().byInstance[ID]?.tasks[0]?.title).toBe("renamed");
  });

  it("keeps the old title rather than accepting an empty edit", () => {
    store().addTask(ID, "a", "1");
    store().editTask(ID, "1", "   ");
    expect(store().byInstance[ID]?.tasks[0]?.title).toBe("a");
  });

  it("removes a single task and leaves the rest", () => {
    store().addTask(ID, "a", "1");
    store().addTask(ID, "b", "2");
    store().removeTask(ID, "1");
    expect(store().byInstance[ID]?.tasks.map((task) => task.id)).toEqual(["2"]);
  });

  it("clears only completed tasks", () => {
    store().addTask(ID, "a", "1");
    store().addTask(ID, "b", "2");
    store().toggleTask(ID, "2");

    store().clearCompleted(ID);

    expect(store().byInstance[ID]?.tasks.map((task) => task.id)).toEqual(["1"]);
  });

  it("restores cleared tasks without duplicating existing ids", () => {
    store().addTask(ID, "a", "1");
    store().addTask(ID, "b", "2");
    store().toggleTask(ID, "2");
    const done = store().byInstance[ID]?.tasks.filter((task) => task.done) ?? [];

    store().clearCompleted(ID);
    store().restoreTasks(ID, done);

    expect(store().byInstance[ID]?.tasks.map((task) => task.id)).toEqual(["1", "2"]);

    store().restoreTasks(ID, done);
    expect(store().byInstance[ID]?.tasks.map((task) => task.id)).toEqual(["1", "2"]);
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

  describe("merge", () => {
    const merge = useTasksStore.persist.getOptions().merge;

    const persistedWith = (removeOnCompletion: boolean) => ({
      byInstance: {
        [ID]: {
          tasks: [
            { id: "1", title: "a", done: true, createdAt: 1000 },
            { id: "2", title: "b", done: false, createdAt: 2000 },
          ],
          autoSort: false,
          completedPosition: "bottom",
          removeOnCompletion,
        },
      },
    });

    it("drops lingering done tasks on rehydrate when remove-on-completion is set", () => {
      const merged = merge?.(persistedWith(true), useTasksStore.getState());
      expect(merged?.byInstance[ID]?.tasks.map((task) => task.id)).toEqual(["2"]);
    });

    it("keeps done tasks on rehydrate when remove-on-completion is off", () => {
      const merged = merge?.(persistedWith(false), useTasksStore.getState());
      expect(merged?.byInstance[ID]?.tasks.map((task) => task.id)).toEqual(["1", "2"]);
    });
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
            tasks: [{ id: "1", title: "a", done: false }],
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

  describe("merge tolerance", () => {
    const merge = useTasksStore.persist.getOptions().merge;
    const mergeInto = (persisted: unknown) =>
      merge?.(persisted, { ...useTasksStore.getState(), byInstance: {} }) as ReturnType<
        typeof useTasksStore.getState
      >;
    const task = (id: string, title: string) => ({ id, title, done: false, createdAt: 1000 });

    it("keeps the other tasks when one entry in the list is unreadable", () => {
      const merged = mergeInto({
        byInstance: { a: { tasks: [task("1", "buy milk"), 5, task("2", "call mum")] } },
      });

      expect(merged.byInstance["a"]?.tasks.map((entry) => entry.title)).toEqual([
        "buy milk",
        "call mum",
      ]);
    });

    it("keeps a task whose title is intact but whose flags are not", () => {
      const merged = mergeInto({
        byInstance: { a: { tasks: [{ id: "1", title: "buy milk", done: "yes", createdAt: "x" }] } },
      });

      expect(merged.byInstance["a"]?.tasks[0]?.title).toBe("buy milk");
      expect(merged.byInstance["a"]?.tasks[0]?.done).toBe(false);
    });

    it("keeps one list's tasks when another instance is unreadable", () => {
      const merged = mergeInto({
        byInstance: { a: { tasks: [task("1", "buy milk")] }, b: 5 },
      });

      expect(Object.keys(merged.byInstance)).toEqual(["a"]);
    });

    it("keeps the tasks when only a display preference is unreadable", () => {
      const merged = mergeInto({
        byInstance: { a: { tasks: [task("1", "buy milk")], completedPosition: "sideways" } },
      });

      expect(merged.byInstance["a"]?.tasks).toHaveLength(1);
      expect(merged.byInstance["a"]?.completedPosition).toBe("bottom");
    });

    it("starts empty rather than throwing on a blob with no lists at all", () => {
      expect(mergeInto({}).byInstance).toEqual({});
      expect(mergeInto({ byInstance: null }).byInstance).toEqual({});
    });
  });
});
