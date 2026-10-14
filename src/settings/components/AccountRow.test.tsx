// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { IntegrationAccountSummary } from "@/integrations";
import { PROVIDERS } from "@/settings/providers";
import { AccountRow } from "@/settings/components/AccountRow";

const provider = PROVIDERS[0]!;
const account: IntegrationAccountSummary = {
  id: "google:person",
  providerId: "google",
  providerAccountId: "person",
  displayName: "Alex Example",
  email: "alex.with.a.very.long.identity@a.long.organization.example",
  status: "connected",
  connectedAt: "2026-10-01T12:00:00Z",
};

describe("AccountRow", () => {
  it("keeps the identity available during reconnection and exposes both recovery actions", () => {
    const onConnect = vi.fn();
    const onDisconnect = vi.fn();
    render(
      <AccountRow
        provider={provider}
        account={{ ...account, status: "needsReconnect" }}
        busy={undefined}
        connectDisabled={false}
        onConnect={onConnect}
        onDisconnect={onDisconnect}
      />,
    );

    expect(screen.getByText(account.email!)).toBeVisible();
    expect(screen.getByText("Reconnect to continue")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Reconnect" }));
    fireEvent.click(screen.getByRole("button", { name: "Disconnect" }));
    expect(onConnect).toHaveBeenCalledOnce();
    expect(onDisconnect).toHaveBeenCalledOnce();
  });

  it("blocks duplicate actions while connecting or disconnecting", () => {
    const onConnect = vi.fn();
    const onDisconnect = vi.fn();
    const props = { provider, connectDisabled: false, onConnect, onDisconnect };
    const { rerender } = render(<AccountRow {...props} account={null} busy="connecting" />);
    const connecting = screen.getByRole("button", { name: "Connecting Google" });
    expect(connecting).toBeDisabled();
    expect(connecting).toHaveAttribute("aria-busy", "true");
    fireEvent.click(connecting);
    expect(onConnect).not.toHaveBeenCalled();

    rerender(
      <AccountRow
        {...props}
        account={{ ...account, status: "needsReconnect" }}
        busy="disconnecting"
      />,
    );
    const disconnecting = screen.getByRole("button", { name: "Disconnecting Google" });
    expect(disconnecting).toBeDisabled();
    expect(disconnecting).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("button", { name: "Reconnect" })).toBeDisabled();
    fireEvent.click(disconnecting);
    fireEvent.click(screen.getByRole("button", { name: "Reconnect" }));
    expect(onDisconnect).not.toHaveBeenCalled();
    expect(onConnect).not.toHaveBeenCalled();
  });

  it("explains an unavailable connection and enables it once setup is ready", () => {
    const onConnect = vi.fn();
    const props = { provider, account: null, busy: undefined, onConnect, onDisconnect: vi.fn() };
    const { rerender } = render(<AccountRow {...props} connectDisabled />);
    expect(screen.getByText("Add your Client ID below to connect")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Connect" }));
    expect(onConnect).not.toHaveBeenCalled();

    rerender(<AccountRow {...props} connectDisabled={false} />);
    expect(screen.getByText(provider.description)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Connect" }));
    expect(onConnect).toHaveBeenCalledOnce();
  });
});
