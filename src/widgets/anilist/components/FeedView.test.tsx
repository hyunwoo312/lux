// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

vi.mock("@/widgets/anilist/lib/api/feed", () => ({
  fetchActivityPage: vi.fn(),
  fetchInboxPage: vi.fn(),
  fetchUnreadCount: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  toggleActivityLike: vi.fn(),
}));
vi.mock("@/widgets/anilist/lib/api/cache", () => ({
  parseCachedActivity: vi.fn().mockReturnValue(null),
  parseCachedInbox: vi.fn().mockReturnValue(null),
}));
vi.mock("@/widgets/anilist/useAnilistSync", () => ({ useAnilistSync: vi.fn() }));

import { TooltipProvider } from "@/components/ui/tooltip";
import { FeedView } from "@/widgets/anilist/components/FeedView";
import {
  fetchActivityPage,
  fetchInboxPage,
  fetchUnreadCount,
  markAllNotificationsRead,
} from "@/widgets/anilist/lib/api/feed";
import { useAnilistStore } from "@/widgets/anilist/useAnilistStore";
import { WidgetInstanceContext } from "@/widgets/core/useWidgetInstance";

const activityMock = vi.mocked(fetchActivityPage);
const inboxMock = vi.mocked(fetchInboxPage);
const unreadMock = vi.mocked(fetchUnreadCount);
const markReadMock = vi.mocked(markAllNotificationsRead);
const ID = "anilist-1";

let userId = 0;
let clock = 1_700_000_000_000;

function renderView() {
  return render(
    <TooltipProvider>
      <WidgetInstanceContext.Provider value={ID}>
        <FeedView enabled userId={userId} newTab={false} />
      </WidgetInstanceContext.Provider>
    </TooltipProvider>,
  );
}

async function settle() {
  await act(async () => {
    await Promise.resolve();
  });
}

const notificationsTab = () => screen.getByRole("radio", { name: /Notifications/ });

beforeEach(() => {
  vi.clearAllMocks();
  userId += 1;
  localStorage.clear();
  vi.spyOn(Date, "now").mockImplementation(() => (clock += 1));
  useAnilistStore.setState({ byInstance: {} });
  useAnilistStore.getState().setFeedSource(ID, "notifications");
  activityMock.mockResolvedValue({ items: [], hasNextPage: false });
  inboxMock.mockResolvedValue({ items: [], hasNextPage: false });
  unreadMock.mockResolvedValue(1);
  markReadMock.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("FeedView", () => {
  it("shows a new notification's badge after the inbox was marked read", async () => {
    renderView();
    await settle();
    expect(within(notificationsTab()).getByText("1")).toBeInTheDocument();

    unreadMock.mockResolvedValue(2);
    fireEvent.click(screen.getByLabelText("Mark all notifications read"));

    await waitFor(() => expect(within(notificationsTab()).getByText("2")).toBeInTheDocument());
  });
});
