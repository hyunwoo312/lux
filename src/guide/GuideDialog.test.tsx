// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { GuideDialog } from "@/guide";
import { useGuideStore } from "@/guide/useGuideStore";
import { FIRST_ARTICLE_ID } from "@/guide/content";
import { useSettingsStore } from "@/settings";
import { widgetPlugins } from "@/widgets/registry";

function open(articleId?: string) {
  useGuideStore.setState({ open: true, articleId: articleId ?? FIRST_ARTICLE_ID });
  render(<GuideDialog />);
}

function nav() {
  return screen.getByRole("navigation", { name: /guide topics/i });
}

beforeEach(() => {
  useGuideStore.setState({ open: false, articleId: FIRST_ARTICLE_ID });
  useSettingsStore.setState({ open: false });
});

describe("GuideDialog", () => {
  it("opens on the first article", () => {
    open();
    expect(screen.getByRole("heading", { name: "What Lux is" })).toBeInTheDocument();
  });

  it("lists every installed widget, so a new widget cannot ship undocumented", () => {
    open();
    for (const plugin of widgetPlugins) {
      expect(within(nav()).getByRole("button", { name: plugin.name })).toBeTruthy();
    }
  });

  it("switches article when a topic is chosen", async () => {
    open();
    fireEvent.click(within(nav()).getByRole("button", { name: "The toolbar" }));

    expect(await screen.findByRole("heading", { name: "The toolbar" })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "What Lux is" })).not.toBeInTheDocument(),
    );
  });

  it("marks the open topic as the current page", () => {
    open("the-toolbar");
    expect(within(nav()).getByRole("button", { name: "The toolbar" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("filters the sidebar as you search", () => {
    open();
    fireEvent.change(screen.getByLabelText(/search the guide/i), { target: { value: "sports" } });

    expect(within(nav()).getByRole("button", { name: "Sports" })).toBeTruthy();
    expect(within(nav()).queryByRole("button", { name: "Calendar" })).toBeNull();
  });

  it("explains itself when a search matches nothing", () => {
    open();
    fireEvent.change(screen.getByLabelText(/search the guide/i), {
      target: { value: "zzzznotathing" },
    });

    expect(screen.getByText(/no results found/i)).toBeInTheDocument();
  });

  it("hands off to settings at the right tab, and gets out of the way", () => {
    open("connecting-accounts");

    fireEvent.click(screen.getByRole("button", { name: /open accounts & permissions/i }));

    expect(useSettingsStore.getState().open).toBe(true);
    expect(useSettingsStore.getState().tab).toBe("accounts");
    expect(useGuideStore.getState().open).toBe(false);
  });

  it("moves to the next article from the pager", async () => {
    open();
    fireEvent.click(screen.getByRole("button", { name: "Next: The toolbar" }));

    expect(await screen.findByRole("heading", { name: "The toolbar" })).toBeInTheDocument();
  });
});

describe("focus on open", () => {
  it("does not park the caret in the search box, which would kill every global shortcut", () => {
    open();

    const search = screen.getByRole("searchbox", { name: "Search the guide" });
    expect(document.activeElement).not.toBe(search);
  });
});
