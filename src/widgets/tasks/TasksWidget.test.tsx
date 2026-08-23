// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TasksWidget } from "@/widgets/tasks/TasksWidget";
import { ClearCompletedButton } from "@/widgets/tasks/components/ClearCompletedButton";
import { useTasksStore } from "@/widgets/tasks/useTasksStore";
import { WidgetInstanceContext } from "@/widgets/core/useWidgetInstance";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { ReactNode } from "react";

const ID = "tasks-widget";
const tasks = () => useTasksStore.getState().byInstance[ID]?.tasks ?? [];

function seed(overrides: Record<string, unknown> = {}) {
  useTasksStore.setState({
    byInstance: {
      [ID]: {
        tasks: [],
        autoSort: false,
        completedPosition: "bottom",
        removeOnCompletion: false,
        ...overrides,
      } as never,
    },
  });
}

function renderIn(node: ReactNode) {
  return render(
    <TooltipProvider>
      <WidgetInstanceContext.Provider value={ID}>{node}</WidgetInstanceContext.Provider>
    </TooltipProvider>,
  );
}

function addTask(title: string) {
  const input = screen.getByRole("textbox", { name: "Add a task" });
  fireEvent.change(input, { target: { value: title } });
  fireEvent.submit(input);
}

beforeEach(() => seed());

describe("TasksWidget", () => {
  it("adds a task from the composer and clears the field", () => {
    renderIn(<TasksWidget />);

    addTask("buy milk");

    expect(tasks().map((task) => task.title)).toEqual(["buy milk"]);
    expect(screen.getByRole("textbox", { name: "Add a task" })).toHaveValue("");
    expect(screen.getByText("buy milk")).toBeInTheDocument();
  });

  it("does not add an empty task", () => {
    renderIn(<TasksWidget />);
    addTask("   ");
    expect(tasks()).toEqual([]);
  });

  it("checks a task off and back on", () => {
    seed({ tasks: [{ id: "1", title: "buy milk", done: false }] });
    renderIn(<TasksWidget />);

    fireEvent.click(screen.getByRole("checkbox", { name: "Mark buy milk as done" }));
    expect(tasks()[0]?.done).toBe(true);

    fireEvent.click(screen.getByRole("checkbox", { name: "Mark buy milk as not done" }));
    expect(tasks()[0]?.done).toBe(false);
  });

  it("renames a task through the edit field", () => {
    seed({ tasks: [{ id: "1", title: "buy milk", done: false }] });
    renderIn(<TasksWidget />);

    fireEvent.click(screen.getByRole("button", { name: "Edit buy milk" }));
    const field = screen.getByRole("textbox", { name: "Edit task" });
    fireEvent.change(field, { target: { value: "buy oat milk" } });
    fireEvent.keyDown(field, { key: "Enter" });

    expect(tasks()[0]?.title).toBe("buy oat milk");
  });

  it("abandons an edit on Escape", () => {
    seed({ tasks: [{ id: "1", title: "buy milk", done: false }] });
    renderIn(<TasksWidget />);

    fireEvent.click(screen.getByRole("button", { name: "Edit buy milk" }));
    const field = screen.getByRole("textbox", { name: "Edit task" });
    fireEvent.change(field, { target: { value: "something else" } });
    fireEvent.keyDown(field, { key: "Escape" });

    expect(tasks()[0]?.title).toBe("buy milk");
  });

  it("deletes a task", () => {
    seed({ tasks: [{ id: "1", title: "buy milk", done: false }] });
    renderIn(<TasksWidget />);

    fireEvent.click(screen.getByRole("button", { name: "Delete buy milk" }));

    expect(tasks()).toEqual([]);
  });

  it("groups completed tasks last when auto-sort is on", () => {
    seed({
      autoSort: true,
      tasks: [
        { id: "1", title: "done one", done: true },
        { id: "2", title: "still open", done: false },
      ],
    });
    renderIn(<TasksWidget />);

    const titles = screen.getAllByRole("listitem").map((row) => row.textContent);
    expect(titles).toEqual(["still open", "done one"]);
  });

  it("takes a completed task away shortly after it is checked", async () => {
    seed({ removeOnCompletion: true, tasks: [{ id: "1", title: "buy milk", done: false }] });
    renderIn(<TasksWidget />);

    fireEvent.click(screen.getByRole("checkbox", { name: "Mark buy milk as done" }));

    await waitFor(() => expect(tasks()).toEqual([]), { timeout: 2000 });
  });
});

describe("ClearCompletedButton", () => {
  it("clears completed tasks and offers them back", () => {
    seed({
      tasks: [
        { id: "1", title: "a", done: true },
        { id: "2", title: "b", done: false },
      ],
    });
    renderIn(<ClearCompletedButton />);

    fireEvent.click(screen.getByRole("button", { name: "Clear completed tasks" }));
    expect(tasks().map((task) => task.id)).toEqual(["2"]);

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(tasks().map((task) => task.id)).toEqual(["2", "1"]);
  });
});
