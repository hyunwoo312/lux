// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QuickAccessWidget } from "@/widgets/quick-access/QuickAccessWidget";
import { useQuickAccessStore } from "@/widgets/quick-access/useQuickAccessStore";
import { WidgetInstanceContext } from "@/widgets/core/useWidgetInstance";
import { useToastStore } from "@/stores/useToastStore";

const ID = "qa-1";

function seed() {
  useQuickAccessStore.setState({
    byInstance: {
      [ID]: {
        links: [{ id: "gh", title: "GitHub", url: "https://github.com/" }],
        activeTab: "home",
        openBehavior: "currentTab",
        view: "list",
        bookmarkPath: [],
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
        <QuickAccessWidget editing={false} justAdded={false} />
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

  it("hands a removed pin to the global undo", () => {
    renderTab();

    fireEvent.click(screen.getByLabelText("Actions for GitHub"));
    fireEvent.click(screen.getByRole("menuitem", { name: "Remove pin" }));
    expect(screen.queryByText("GitHub")).not.toBeInTheDocument();
    expect(useToastStore.getState().toast?.message).toBe("Removed GitHub");

    act(() => useToastStore.getState().runAction());

    expect(screen.getByText("GitHub")).toBeInTheDocument();
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

describe("pin renovation", () => {
  it("filters local pins by domain and keeps the query when revisiting Home", async () => {
    renderTab();
    const filter = screen.getByRole("searchbox", { name: "Filter pinned links" });
    fireEvent.change(filter, { target: { value: " github.com " } });
    expect(screen.getByRole("link", { name: /GitHub/ })).toBeInTheDocument();
    await act(async () => {
      useQuickAccessStore.getState().setActiveTab(ID, "bookmarks");
    });
    await act(async () => {
      useQuickAccessStore.getState().setActiveTab(ID, "home");
    });
    expect(filter).toHaveValue(" github.com ");
    fireEvent.change(filter, { target: { value: "missing" } });
    expect(screen.getByText(/No pinned links match/)).toBeInTheDocument();
  });
  it("prefills a dropped URL without saving until explicit Save, then focuses the new pin", async () => {
    const { container } = renderTab();
    fireEvent.drop(container.querySelector("[data-pin-id]")!, {
      dataTransfer: { types: ["text/uri-list"], getData: () => "https://example.com/docs" },
    });
    expect(screen.getByLabelText("Link URL")).toHaveValue("https://example.com/docs");
    expect(useQuickAccessStore.getState().byInstance[ID]?.links).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(useQuickAccessStore.getState().byInstance[ID]?.links).toHaveLength(2);
    await waitFor(() => expect(screen.getByRole("link", { name: /example.com/ })).toHaveFocus());
  });
  it("rejects invalid drops and preserves an existing form draft", () => {
    const { container } = renderTab();
    const home = container.querySelector("[data-pin-id]")!.closest("li")!;
    fireEvent.drop(home, {
      dataTransfer: { types: ["text/plain"], getData: () => "javascript:alert(1)" },
    });
    expect(screen.queryByLabelText("Link URL")).toBeNull();
    expect(useToastStore.getState().toast?.message).toMatch(/one http or https link/);
    openAddForm();
    fireEvent.change(screen.getByLabelText("Link title"), { target: { value: "My draft" } });
    fireEvent.drop(screen.getByLabelText("Link title"), {
      dataTransfer: { types: ["text/plain"], getData: () => "https://other.test" },
    });
    expect(screen.getByLabelText("Link title")).toHaveValue("My draft");
    expect(screen.getByLabelText("Link URL")).toHaveValue("");
  });
  it("supports menu keyboard movement and preserves pin identity/order through editing", async () => {
    renderTab();
    fireEvent.click(screen.getByLabelText("Actions for GitHub"));
    const open = screen.getByRole("menuitem", { name: "Open link" });
    open.focus();
    fireEvent.keyDown(open, { key: "End" });
    expect(screen.getByRole("menuitem", { name: "Remove pin" })).toHaveFocus();
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit link…" }));
    const title = screen.getByLabelText("Link title");
    fireEvent.change(title, { target: { value: "Code home" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(useQuickAccessStore.getState().byInstance[ID]?.links[0]?.id).toBe("gh");
    await waitFor(() => expect(screen.getByRole("link", { name: /Code home/ })).toHaveFocus());
  });
  it("announces clipboard failure without mutating pins", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });
    renderTab();
    fireEvent.click(screen.getByLabelText("Actions for GitHub"));
    fireEvent.click(screen.getByRole("menuitem", { name: "Copy link" }));
    await waitFor(() =>
      expect(screen.getByText("Could not copy link. Try again.")).toBeInTheDocument(),
    );
    expect(useQuickAccessStore.getState().byInstance[ID]?.links).toHaveLength(1);
  });
});
