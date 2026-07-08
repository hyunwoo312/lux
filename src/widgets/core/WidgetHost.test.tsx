// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useIntegrationStore } from "@/integrations";
import { WidgetHost } from "@/widgets/core/WidgetHost";

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

  it("overlays a connect action on the sample widget when signed out", () => {
    renderHost();

    expect(screen.getByRole("button", { name: "Connect" })).toBeInTheDocument();
    expect(screen.getByText("contributions in the last year")).toBeInTheDocument();
  });

  it("makes the sample content inert so keyboard focus can't reach behind the overlay", () => {
    renderHost();

    expect(screen.getByText("contributions in the last year").closest("[inert]")).not.toBeNull();
  });

  it("drops the connect overlay while editing so the widget stays manageable", () => {
    renderHost(true);

    expect(screen.queryByRole("button", { name: "Connect" })).not.toBeInTheDocument();
  });
});
