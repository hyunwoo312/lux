// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";

vi.mock("@/widgets/anilist/lib/anilist-api", () => ({
  fetchActivityPage: vi.fn(),
  fetchUnreadCount: vi.fn(),
  parseCachedActivity: vi.fn(),
  toggleActivityLike: vi.fn(),
}));
vi.mock("@/widgets/anilist/useAnilistSync", () => ({ useAnilistSync: vi.fn() }));

import { PAGED_CACHE_PREFIX } from "@/lib/local-store";
import { ActivityView } from "@/widgets/anilist/components/ActivityView";
import {
  fetchActivityPage,
  fetchUnreadCount,
  parseCachedActivity,
} from "@/widgets/anilist/lib/anilist-api";
import { anilistKeys } from "@/widgets/anilist/lib/cache-keys";
import { useAnilistSignals } from "@/widgets/anilist/useAnilistSignals";
import { useAnilistStore } from "@/widgets/anilist/useAnilistStore";
import { WidgetInstanceContext } from "@/widgets/core/useWidgetInstance";
import {
  ACTIVITY_REFRESH_MS,
  ANILIST_PAGE_SIZE,
  type AnilistActivity,
} from "@/widgets/anilist/types";

const activityMock = vi.mocked(fetchActivityPage);
const unreadMock = vi.mocked(fetchUnreadCount);
const parseCachedMock = vi.mocked(parseCachedActivity);
const ID = "anilist-1";
const MINUTE = 60 * 1000;

let USER = 0;

function activity(overrides: Partial<AnilistActivity> = {}): AnilistActivity {
  return {
    id: 1,
    kind: "text",
    createdAt: 1_700_000_000,
    userName: "someone",
    text: "posted something",
    siteUrl: "https://anilist.co/activity/1",
    isLiked: false,
    ...overrides,
  };
}

function seedCache(ageMs: number, pages = 1): void {
  localStorage.setItem(
    PAGED_CACHE_PREFIX + anilistKeys.activity(USER, "english"),
    JSON.stringify({
      items: Array.from({ length: ANILIST_PAGE_SIZE * pages }, (_, index) =>
        activity({ id: index + 1 }),
      ),
      page: pages,
      hasNextPage: false,
      at: Date.now() - ageMs,
    }),
  );
}

function Badge() {
  useAnilistSignals(true, USER);
  return null;
}

function renderTree(children: React.ReactNode) {
  return render(
    <WidgetInstanceContext.Provider value={ID}>{children}</WidgetInstanceContext.Provider>,
  );
}

async function settle() {
  await act(async () => {
    await Promise.resolve();
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  USER += 1;
  localStorage.clear();
  useAnilistStore.setState({
    byInstance: {
      [ID]: {
        activeTab: "activity",
        mediaFilter: "both",
        currentSort: "score",
        titleLanguage: "english",
        openBehavior: "currentTab",
        discoverFeed: "trending",
        discoverType: "anime",
        listFilter: "all",
      },
    },
  });
  parseCachedMock.mockImplementation((raw) => raw as AnilistActivity[]);
  activityMock.mockResolvedValue({ items: [activity()], hasNextPage: false });
  unreadMock.mockResolvedValue(0);
});

describe("AniList activity polling", () => {
  it("shares one fetch between the tab badge and the open activity view", async () => {
    renderTree(
      <>
        <Badge />
        <ActivityView enabled userId={USER} newTab={false} />
      </>,
    );
    await settle();

    expect(activityMock).toHaveBeenCalledTimes(1);
  });

  it("leaves a cache the badge alone would have refetched", async () => {
    seedCache(5 * MINUTE);
    renderTree(<Badge />);
    await settle();

    expect(activityMock).not.toHaveBeenCalled();
  });

  it("refetches for the badge once the longer cadence has elapsed", async () => {
    seedCache(ACTIVITY_REFRESH_MS + MINUTE);
    renderTree(<Badge />);
    await settle();

    expect(activityMock).toHaveBeenCalledTimes(1);
  });

  it("refetches when the activity view is opened onto a cache older than its own window", async () => {
    seedCache(5 * MINUTE);
    renderTree(<ActivityView enabled userId={USER} newTab={false} />);
    await settle();

    expect(activityMock).toHaveBeenCalledTimes(1);
  });

  it("leaves a feed the reader has already paged through alone", async () => {
    seedCache(5 * MINUTE, 2);
    renderTree(<ActivityView enabled userId={USER} newTab={false} />);
    await settle();

    expect(activityMock).not.toHaveBeenCalled();
  });

  it("does not refetch when the activity view is opened onto a fresh cache", async () => {
    seedCache(MINUTE);
    renderTree(<ActivityView enabled userId={USER} newTab={false} />);
    await settle();

    expect(activityMock).not.toHaveBeenCalled();
  });

  it("still only fetches once when the badge already holds the resource", async () => {
    seedCache(5 * MINUTE);
    const view = renderTree(<Badge />);
    await settle();
    view.rerender(
      <WidgetInstanceContext.Provider value={ID}>
        <>
          <Badge />
          <ActivityView enabled userId={USER} newTab={false} />
        </>
      </WidgetInstanceContext.Provider>,
    );
    await settle();

    expect(activityMock).toHaveBeenCalledTimes(1);
  });
});
