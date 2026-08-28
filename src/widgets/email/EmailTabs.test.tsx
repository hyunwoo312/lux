// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { useIntegrationStore } from "@/integrations";
import { EmailTabs } from "@/widgets/email/EmailTabs";
import { useEmailStore } from "@/widgets/email/useEmailStore";
import { WidgetInstanceContext } from "@/widgets/core/useWidgetInstance";

const ID = "email-tabs";

beforeEach(() => {
  useIntegrationStore.setState({
    accounts: [
      {
        id: "g1",
        providerId: "google",
        providerAccountId: "1",
        displayName: "me",
        status: "connected",
        connectedAt: "2026-06-20T00:00:00.000Z",
      },
    ],
    loaded: true,
  });
});

describe("EmailTabs", () => {
  it("offers a mailbox tab only for a connected mailbox", () => {
    render(
      <WidgetInstanceContext.Provider value={ID}>
        <EmailTabs />
      </WidgetInstanceContext.Provider>,
    );

    expect(screen.getByRole("tab", { name: /Gmail/ })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /Outlook/ })).not.toBeInTheDocument();
  });

  it("falls back to the shared inbox when the stored mailbox is no longer connected", () => {
    useEmailStore.getState().setView(ID, "microsoft");

    render(
      <WidgetInstanceContext.Provider value={ID}>
        <EmailTabs />
      </WidgetInstanceContext.Provider>,
    );

    expect(screen.getByRole("tab", { name: /All/ })).toHaveAttribute("aria-selected", "true");
  });
});
