// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QuickAccessWidget } from "@/widgets/quick-access/QuickAccessWidget";
import { useQuickAccessStore } from "@/widgets/quick-access/useQuickAccessStore";
import { WidgetInstanceContext } from "@/widgets/core/useWidgetInstance";

const ID = "qa-1";

function seed() {
  useQuickAccessStore.setState({
    byInstance: {
      [ID]: {
        links: [{ id: "gh", title: "GitHub", url: "https://github.com/" }],
        activeTab: "home",
        openBehavior: "currentTab",
        view: "list",
        showTopSites: false,
        showOpenTabs: false,
        showRecentlyClosed: false,
      },
    },
  });
}

function renderTab() {
  return render(
    <WidgetInstanceContext.Provider value={ID}>
      <TooltipProvider>
        <QuickAccessWidget editing={false} />
      </TooltipProvider>
    </WidgetInstanceContext.Provider>,
  );
}

function openAddForm() {
  fireEvent.click(screen.getByLabelText("Add link"));
}

beforeEach(seed);

describe("HomeTab add form", () => {
  it("says why an already-pinned link was not added, and keeps the draft", () => {
    renderTab();
    openAddForm();

    fireEvent.change(screen.getByLabelText("Link URL"), { target: { value: "github.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByRole("alert")).toHaveTextContent("already pinned");
    expect(screen.getByLabelText("Link URL")).toHaveValue("github.com");
  });

  it("says why an unusable address was not added", () => {
    renderTab();
    openAddForm();

    fireEvent.change(screen.getByLabelText("Link URL"), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByRole("alert")).toHaveTextContent("web address");
  });

  it("closes the form once the link is accepted", () => {
    renderTab();
    openAddForm();

    fireEvent.change(screen.getByLabelText("Link URL"), { target: { value: "example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.queryByLabelText("Link URL")).not.toBeInTheDocument();
    expect(screen.getByText("example.com")).toBeInTheDocument();
  });

  it("offers an undo that puts the pin back", () => {
    renderTab();

    fireEvent.click(screen.getByLabelText("Remove GitHub"));
    expect(screen.queryByText("GitHub")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));

    expect(screen.getByText("GitHub")).toBeInTheDocument();
  });

  it("puts the pin back where it was, not at the end", () => {
    useQuickAccessStore.setState({
      byInstance: {
        [ID]: {
          links: [
            { id: "a", title: "One", url: "https://one.com/" },
            { id: "b", title: "Two", url: "https://two.com/" },
            { id: "c", title: "Three", url: "https://three.com/" },
          ],
          activeTab: "home",
          openBehavior: "currentTab",
          view: "list",
          showTopSites: false,
          showOpenTabs: false,
          showRecentlyClosed: false,
        },
      },
    });
    renderTab();

    fireEvent.click(screen.getByLabelText("Remove Two"));
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));

    const titles = screen.getAllByText(/^(One|Two|Three)$/).map((node) => node.textContent);
    expect(titles).toEqual(["One", "Two", "Three"]);
  });
});

describe("pins as real links", () => {
  it("renders a pin as an anchor carrying its url", () => {
    seed();
    renderTab();
    expect(screen.getByRole("link", { name: /GitHub/ })).toHaveAttribute(
      "href",
      "https://github.com/",
    );
  });

  it("does not let a drag start a navigation", () => {
    seed();
    renderTab();
    expect(screen.getByRole("link", { name: /GitHub/ })).toHaveAttribute("draggable", "false");
  });

  it("keeps edit and remove out of the anchor, so they are not nested interactives", () => {
    seed();
    renderTab();
    const link = screen.getByRole("link", { name: /GitHub/ });
    expect(link.querySelector("button")).toBeNull();
  });
});
