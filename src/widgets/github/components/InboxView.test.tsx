// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("@/widgets/github/lib/api/inbox", () => ({
  fetchInbox: () => Promise.resolve(INBOX),
  parseCachedInbox: () => null,
  markGithubThreadRead: () => Promise.reject(new Error("boom")),
  markAllGithubNotificationsRead: () => Promise.resolve(),
  unsubscribeGithubThread: () => Promise.resolve(),
}));

import { TooltipProvider } from "@/components/ui/tooltip";
import { useToastStore } from "@/stores/useToastStore";
import { InboxView } from "@/widgets/github/components/InboxView";
import { WidgetInstanceContext } from "@/widgets/core/useWidgetInstance";
import type { InboxData } from "@/widgets/github/types";

const INBOX: InboxData = {
  notifications: [
    {
      id: "n1",
      title: "Release cut",
      reason: "subscribed",
      repo: "o/web",
      isPrivate: false,
      updatedAt: new Date().toISOString(),
      url: "https://github.com/o/web",
    },
  ],
  pullRequests: [],
  issues: [],
};

describe("InboxView", () => {
  it("says so when marking a notification read fails", async () => {
    render(
      <WidgetInstanceContext.Provider value="github-inbox">
        <TooltipProvider>
          <InboxView enabled showPrivate />
        </TooltipProvider>
      </WidgetInstanceContext.Provider>,
    );

    fireEvent.click(await screen.findByRole("button", { name: /Mark "Release cut" as read/ }));

    await waitFor(() => expect(useToastStore.getState().toast).not.toBeNull());
  });
});
