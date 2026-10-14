// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useIntegrationStore } from "@/integrations";
import { WidgetHost } from "@/widgets/core/WidgetHost";
import { tasksPlugin } from "@/widgets/tasks";
import { useDashboardStore } from "@/stores/useDashboardStore";

function renderHost(editing = false) {
  return render(
    <TooltipProvider>
      <WidgetHost instance={{ id: "github-1", type: "github" }} editing={editing} />
    </TooltipProvider>,
  );
}

describe("WidgetHost lock overlay", () => {
  beforeEach(() => {
    useIntegrationStore.setState({ accounts: [], loaded: true });
  });

  it("makes the sample content inert so keyboard focus can't reach behind the overlay", () => {
    renderHost();

    expect(screen.getByText(/contributions in the last year/).closest("[inert]")).not.toBeNull();
  });

  it("drops the connect overlay while editing so the widget stays manageable", () => {
    renderHost(true);

    expect(screen.queryByRole("button", { name: "Connect" })).not.toBeInTheDocument();
  });

  it("preserves a capture draft through resize while live widget data still updates", async () => {
    const instance = { id: "tasks-performance", type: "tasks" } as const;
    tasksPlugin.clearInstance?.(instance.id);
    useDashboardStore.setState({ widgets: [instance] });
    const { rerender } = render(
      <TooltipProvider>
        <WidgetHost instance={instance} editing={false} size={{ w: 6, h: 8 }} />
      </TooltipProvider>,
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Add a task" }), {
      target: { value: "Draft" },
    });
    rerender(
      <TooltipProvider>
        <WidgetHost instance={instance} editing={false} size={{ w: 9, h: 9 }} />
      </TooltipProvider>,
    );
    const capture = tasksPlugin.commands?.()[0];
    if (capture?.kind !== "provider") throw new Error("Missing task capture");
    await act(async () => {
      const results = await capture.search("Incoming update", new AbortController().signal);
      await results[0]?.run();
    });
    expect(screen.getByRole("textbox", { name: "Add a task" })).toHaveValue("Draft");
    expect(screen.getByRole("button", { name: "Edit Incoming update" })).toBeInTheDocument();
    useDashboardStore.setState({ widgets: [] });
  });
});
