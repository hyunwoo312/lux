// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/widgets/quick-access/browser", () => ({
  focusTab: vi.fn(),
  restoreSession: vi.fn(async () => true),
}));
vi.mock("@/lib/open-url", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/open-url")>()),
  openUrl: vi.fn(),
}));

import { renderHook } from "@testing-library/react";
import { openUrl } from "@/lib/open-url";
import { focusTab, restoreSession } from "@/widgets/quick-access/browser";
import { useItemActions } from "@/widgets/quick-access/hooks/useItemActions";
import { WidgetInstanceContext } from "@/widgets/core/useWidgetInstance";
import type { BrowserItem } from "@/widgets/quick-access/types";

const ID = "qa-1";

function actions() {
  return renderHook(() => useItemActions(), {
    wrapper: ({ children }) => (
      <WidgetInstanceContext.Provider value={ID}>{children}</WidgetInstanceContext.Provider>
    ),
  }).result.current;
}

function clickEvent(over: Partial<MouseEvent> = {}) {
  return {
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    button: 0,
    preventDefault: vi.fn(),
    ...over,
  } as unknown as React.MouseEvent<HTMLAnchorElement>;
}

const openTab: BrowserItem = {
  id: "tab-7",
  title: "A",
  url: "https://a.test/",
  tabId: 7,
  windowId: 2,
};
const closedTab: BrowserItem = {
  id: "s-1",
  title: "B",
  url: "https://b.test/",
  sessionId: "s-1",
};
const plainLink: BrowserItem = { id: "h-1", title: "C", url: "https://c.test/" };

beforeEach(() => vi.clearAllMocks());

describe("useItemActions.open", () => {
  it("switches to an already-open tab instead of navigating to its address", () => {
    const event = clickEvent();
    actions().open(openTab, event);

    expect(focusTab).toHaveBeenCalledWith(7, 2);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(openUrl).not.toHaveBeenCalled();
  });

  it("restores a closed tab in its old place rather than reopening the address", () => {
    const event = clickEvent();
    actions().open(closedTab, event);

    expect(restoreSession).toHaveBeenCalledWith("s-1");
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it("leaves an ordinary link to the anchor, so the browser handles it", () => {
    const event = clickEvent();
    actions().open(plainLink, event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(focusTab).not.toHaveBeenCalled();
    expect(restoreSession).not.toHaveBeenCalled();
  });

  it("lets a modified click through untouched, even on an open tab", () => {
    const event = clickEvent({ metaKey: true });
    actions().open(openTab, event);

    expect(focusTab).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it("lets a middle click through, so it opens in a new tab", () => {
    const event = clickEvent({ button: 1 });
    actions().open(openTab, event);

    expect(focusTab).not.toHaveBeenCalled();
  });
});
