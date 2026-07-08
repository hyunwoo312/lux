// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useIntegrationStore } from "@/integrations";
import { GithubWidget } from "@/widgets/github/GithubWidget";
import { useGithubStore } from "@/widgets/github/useGithubStore";
import { WidgetInstanceContext } from "@/widgets/core/useWidgetInstance";
import type { GithubView } from "@/widgets/github/types";

const ID = "github-1";

function patchView(view: GithubView) {
  useGithubStore.setState({
    byInstance: { [ID]: { view, showPrivate: true, openBehavior: "currentTab" } },
  });
}

function renderWidget() {
  return render(
    <WidgetInstanceContext.Provider value={ID}>
      <TooltipProvider>
        <GithubWidget />
      </TooltipProvider>
    </WidgetInstanceContext.Provider>,
  );
}

beforeEach(() => {
  useIntegrationStore.setState({ accounts: [], loaded: true });
  patchView("contributions");
});

describe("GithubWidget signed-out preview", () => {
  it("previews the contribution graph with sample data when signed out", () => {
    renderWidget();

    expect(screen.getByText("contributions in the last year")).toBeInTheDocument();
  });

  it("previews the inbox with sample data when signed out", () => {
    patchView("inbox");
    renderWidget();

    expect(screen.getByText("Review requests")).toBeInTheDocument();
  });
});
