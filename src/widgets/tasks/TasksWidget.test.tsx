// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TasksWidget } from "@/widgets/tasks/TasksWidget";
import { ClearCompletedButton } from "@/widgets/tasks/components/ClearCompletedButton";
import { useTasksStore } from "@/widgets/tasks/useTasksStore";
import { useToastStore } from "@/stores/useToastStore";
import { WidgetInstanceContext } from "@/widgets/core/useWidgetInstance";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { ReactNode } from "react";
import { TasksSearch } from "@/widgets/tasks/components/TasksSearch";
import { useTasksFilterStore } from "@/widgets/tasks/useTasksFilterStore";

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

afterEach(() => {
  vi.useRealTimers();
});

beforeEach(() => {
  seed();
  useTasksFilterStore.setState({ byInstance: {} });
});

describe("TasksWidget", () => {
  it("shares header search with the list and clears without changing saved tasks", async () => {
    seed({
      tasks: [
        { id: "1", title: "Plan dinner", description: "Reservations", done: false },
        { id: "2", title: "Write report", done: false },
      ],
    });
    renderIn(
      <>
        <TasksSearch />
        <TasksWidget />
      </>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Find tasks" }));
    fireEvent.change(screen.getByRole("searchbox", { name: "Find tasks" }), {
      target: { value: "Reservations" },
    });
    expect(screen.getByRole("button", { name: "Edit Plan dinner" })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Edit Write report" })).not.toBeInTheDocument(),
    );
    expect(tasks()).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Close search" }));
    expect(screen.getByRole("button", { name: "Edit Write report" })).toBeInTheDocument();
  });

  it("keeps the important filter and icon order menu available even on an empty list", () => {
    renderIn(<TasksWidget />);
    fireEvent.click(screen.getByRole("button", { name: "Important tasks only" }));
    expect(screen.getByRole("button", { name: "Important tasks only" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("combobox", { name: "Task order" })).toHaveTextContent("");
    fireEvent.keyDown(screen.getByRole("combobox", { name: "Task order" }), { key: "Enter" });
    fireEvent.click(screen.getByRole("option", { name: "Manual" }));
    expect(useTasksStore.getState().byInstance[ID]?.order).toBe("manual");
    expect(tasks()).toEqual([]);
  });

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

  it("changes capture destination without submitting the form", () => {
    renderIn(<TasksWidget />);
    fireEvent.change(screen.getByRole("textbox", { name: "Add a task" }), {
      target: { value: "Plan dinner" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add to today" }));
    expect(tasks()).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Add task" }));
    expect(tasks()[0]?.todayKey).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Add a task" })).toHaveFocus();
  });

  it("keeps capture destination consistent with prefixes and permits overriding them", () => {
    renderIn(<TasksWidget />);
    const input = screen.getByRole("textbox", { name: "Add a task" });
    fireEvent.change(input, { target: { value: "/today /flag Plan dinner" } });
    const destination = screen.getByRole("button", { name: "Add to today" });
    expect(destination).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(destination);
    expect(destination).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(screen.getByRole("button", { name: "Add task" }));
    expect(tasks()[0]).toMatchObject({ title: "Plan dinner", important: true });
    expect(tasks()[0]?.todayKey).toBeUndefined();
  });

  it("keeps detail changes provisional until Save and cancels the entire draft", () => {
    const original = {
      id: "1",
      title: "Plan dinner",
      done: false,
      subtasks: [{ id: "step", title: "Buy groceries", done: false }],
    };
    seed({ tasks: [original] });
    renderIn(<TasksWidget />);
    fireEvent.click(screen.getByRole("button", { name: "Edit Plan dinner" }));
    fireEvent.click(screen.getByRole("switch", { name: "Important task" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove checklist item 1" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(tasks()[0]).toEqual(original);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(tasks()[0]).toEqual(original);
    fireEvent.click(screen.getByRole("button", { name: "Edit Plan dinner" }));
    fireEvent.click(screen.getByRole("switch", { name: "Important task" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Complete checklist item 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Save task" }));
    expect(tasks()[0]).toMatchObject({ important: true, done: true, subtasks: [{ done: true }] });
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

    vi.useFakeTimers({ shouldAdvanceTime: true });
    fireEvent.click(screen.getByRole("checkbox", { name: "Mark buy milk as done" }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(tasks()).toEqual([]);
  });

  it("cancels pending removal when unchecked and does not remove a completed task for flag edits", async () => {
    seed({
      removeOnCompletion: true,
      tasks: [
        { id: "1", title: "Plan", done: false },
        { id: "2", title: "Already done", done: true },
      ],
    });
    renderIn(<TasksWidget />);
    vi.useFakeTimers({ shouldAdvanceTime: true });
    fireEvent.click(screen.getByRole("checkbox", { name: "Mark Plan as done" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Mark Plan as not done" }));
    fireEvent.keyDown(screen.getByRole("button", { name: "Edit Already done" }), { key: "f" });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(tasks().map((t) => t.id)).toEqual(["1", "2"]);
    expect(tasks()[1]?.important).toBe(true);
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

    const toast = useToastStore.getState().toast;
    expect(toast?.message).toBe("1 task cleared");
    expect(toast?.action?.kind).toBe("undo");
    toast?.action?.run();
    expect(tasks().map((task) => task.id)).toEqual(["1", "2"]);
  });
});
