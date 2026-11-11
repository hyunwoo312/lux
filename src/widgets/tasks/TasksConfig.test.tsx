// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TasksConfig } from "@/widgets/tasks/TasksConfig";
import { useTasksStore } from "@/widgets/tasks/useTasksStore";
import { useToastStore } from "@/stores/useToastStore";
import { WidgetInstanceContext } from "@/widgets/core/useWidgetInstance";
import { TooltipProvider } from "@/components/ui/tooltip";

const ID = "tasks-config";

const tasks = () => useTasksStore.getState().byInstance[ID]?.tasks ?? [];

beforeEach(() => {
  useToastStore.setState({ toast: null });
  useTasksStore.setState({ byInstance: {} });
  useTasksStore.getState().addTask(ID, "open", "t-open");
  useTasksStore.getState().addTask(ID, "finished", "t-finished");
  useTasksStore.getState().toggleTask(ID, "t-finished");
});

describe("Remove on completion", () => {
  it("clears tasks already finished when turned on, behind an Undo", () => {
    render(
      <WidgetInstanceContext.Provider value={ID}>
        <TooltipProvider>
          <TasksConfig />
        </TooltipProvider>
      </WidgetInstanceContext.Provider>,
    );

    fireEvent.click(screen.getByRole("switch", { name: "Remove tasks on completion" }));

    expect(tasks().map((task) => task.title)).toEqual(["open"]);
    useToastStore.getState().runAction();
    expect(
      tasks()
        .map((task) => task.title)
        .sort(),
    ).toEqual(["finished", "open"]);
  });
});
