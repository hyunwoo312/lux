import { afterEach, describe, expect, it } from "vitest";
import { tasksCommands } from "@/widgets/tasks/commands";
import { useTasksStore } from "@/widgets/tasks/useTasksStore";
import { useDashboardStore } from "@/stores/useDashboardStore";
import { localDayKey } from "@/lib/clock";

afterEach(() => {
  useTasksStore.setState({ byInstance: {} });
  useDashboardStore.setState({ widgets: [] });
});

describe("task capture commands", () => {
  it("offers each placed instance and adds only to the selected destination", async () => {
    useDashboardStore.setState({
      widgets: [
        { id: "one", type: "tasks" },
        { id: "two", type: "tasks" },
      ],
    });
    useTasksStore.getState().setView("two", "today");
    const provider = tasksCommands()[0]!;
    if (provider.kind !== "provider") throw new Error("Missing capture provider");
    const results = await provider.search("/flag Write report", new AbortController().signal);
    expect(results.map((result) => result.detail)).toEqual([
      "Tasks 1 · Later · Important",
      "Tasks 2 · Today · Important",
    ]);
    await results[1]!.run();
    expect(useTasksStore.getState().byInstance.one).toBeUndefined();
    expect(useTasksStore.getState().byInstance.two?.tasks[0]).toMatchObject({
      title: "Write report",
      important: true,
      todayKey: localDayKey(new Date()),
    });
    expect(await provider.search("/today /flag", new AbortController().signal)).toEqual([]);
  });
});
